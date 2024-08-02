import {NextRequest, NextResponse} from 'next/server';
import {pipe} from 'next-route-handler-pipe';
import {
  VerifiedAuthenticationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import {decodeClientDataJSON, isoBase64URL} from '@simplewebauthn/server/helpers';
import {AuthenticationResponseJSON} from '@simplewebauthn/types';
import {z} from 'zod';

import {challenges, users} from '@/db';
import {validateBody} from '@/lib/validation';
import {origin, rpID} from '../register/route';

const schema = z.object({
  id: z.string().refine(isoBase64URL.isBase64URL),
  rawId: z.string().refine(isoBase64URL.isBase64URL),
  response: z.object({
    clientDataJSON: z.string().refine(isoBase64URL.isBase64URL),
    authenticatorData: z.string().refine(isoBase64URL.isBase64URL),
    signature: z.string().refine(isoBase64URL.isBase64URL),
    userHandle: z.string().refine(isoBase64URL.isBase64URL).optional(),
  }),
  authenticatorAttachment: z.enum(['platform', 'cross-platform']).optional(),
  clientExtensionResults: z.object({
    appid: z.boolean().optional(),
    credProps: z
      .object({
        rk: z.boolean().optional(),
      })
      .optional(),
    hmacCreateSecret: z.boolean().optional(),
  }),
  type: z.enum(['public-key']),
}) satisfies z.ZodSchema<AuthenticationResponseJSON>;

type AuthData = z.infer<typeof schema>;

export const GET = async (req: NextRequest) => {
  const options = await generateAuthenticationOptions({
    rpID: rpID,
    userVerification: 'required',
  });

  const stored = await challenges.set({
    origin: options.rpId ?? 'localhost',
    challenge: options.challenge,
    timeout: 60000,
  });
  if (!stored) return NextResponse.json({error: 'authentication error'}, {status: 500});

  return NextResponse.json(options, {status: 200});
};

export const POST = pipe(validateBody(schema), async (req: NextRequest & {data: AuthData}) => {
  const {data} = req;
  const clientData = decodeClientDataJSON(data.response.clientDataJSON);

  // Ensure this challenge is valid
  const validChallenge = await challenges.getdel(clientData.challenge);
  if (!validChallenge || !data.response.userHandle) {
    console.log('Authentication error', validChallenge, data.response);
    return NextResponse.json({error: 'authentication error'}, {status: 400});
  }

  // Get the user this authentication challenge is associated with
  const user = await users.get(data.response.userHandle);
  const passkey = user.passkeys.find(passkey => passkey.credentialID === data.id);
  if (!passkey) {
    console.log('Authentication error', user, data);
    return NextResponse.json({error: 'authentication error'}, {status: 400});
  }

  console.log({clientData, data, user, passkey});

  let assertion: VerifiedAuthenticationResponse | null = null;
  try {
    assertion = await verifyAuthenticationResponse({
      response: data,
      expectedChallenge: validChallenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: passkey,
    });
  } catch (error) {
    console.error('Authentication error', error);
  }
  if (!assertion || !assertion.verified) {
    return NextResponse.json({error: 'authentication error'}, {status: 400});
  }

  if (assertion.authenticationInfo.newCounter > passkey.counter) {
    const update = await users.set({
      ...user,
      passkeys: [
        ...user.passkeys.map(passkey => ({
          ...passkey,
          counter:
            passkey.credentialID === data.id
              ? assertion.authenticationInfo.newCounter
              : passkey.counter,
        })),
      ],
    });
    if (!update) return NextResponse.json({error: 'authentication error'}, {status: 500});
  } else if (assertion.authenticationInfo.newCounter > 0) {
    // TODO: Flag this as a potential replay attack
  }

  // TODO: Return a JWT token that can be used to access protected resources
  return NextResponse.json({}, {status: 200});
});
