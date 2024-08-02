import {base64URLStringToBuffer, bufferToBase64URLString} from '@simplewebauthn/browser';

import {redis} from '@/lib/redis';

import type {Base64URLString} from '@simplewebauthn/types';

export type UserRecord = {
  id: string;
  name?: string;
  passkeys: Array<{
    credentialID: Base64URLString;
    credentialPublicKey: Uint8Array;
    counter: number;
    transports: Array<'ble' | 'cable' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb'>;
  }>;
};

type UserRecordEncoded = {
  id: string;
  name?: string;
  passkeys: Array<{
    credentialID: Base64URLString;
    credentialPublicKey: Base64URLString;
    counter: number;
    transports: Array<'ble' | 'cable' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb'>;
  }>;
};

export function exists(id: string) {
  return redis.exists(`users:${id}`).then(exists => exists > 0);
}

export async function get(id: string, name?: string): Promise<UserRecord> {
  const UserRecord = await redis.get<UserRecordEncoded>(`users:${id}`);
  if (UserRecord) {
    return {
      ...UserRecord,
      passkeys: UserRecord.passkeys.map(passkey => ({
        ...passkey,
        credentialPublicKey: new Uint8Array(base64URLStringToBuffer(passkey.credentialPublicKey)),
      })),
    };
  }
  return {id, name, passkeys: []};
}

export function set(user: UserRecord) {
  const record = {
    ...user,
    passkeys: user.passkeys.map(passkey => ({
      ...passkey,
      credentialPublicKey: bufferToBase64URLString(passkey.credentialPublicKey),
    })),
  };
  return redis.set<UserRecordEncoded>(`users:${user.id}`, record);
}
