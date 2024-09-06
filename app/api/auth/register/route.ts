import {cookies} from 'next/headers';
import {NextRequest, NextResponse} from 'next/server';
import {pipe} from 'next-route-handler-pipe';
import {
  VerifiedRegistrationResponse,
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import {decodeClientDataJSON, isoBase64URL} from '@simplewebauthn/server/helpers';
import {z} from 'zod';

import {challenges, users} from '@/db';
import * as jwt from '@/lib/jwt';
import {validateBody, validateSearch} from '@/lib/validation';

import type {RegistrationResponseJSON} from '@simplewebauthn/types';

export const rpName = 'Dice Caster';
export const rpID = new URL(process.env.HOST ?? 'https://localhost:3000').hostname;
export const origin = new URL(process.env.HOST ?? 'https://localhost:3000').origin;

const schemaParams = z.object({
  user: z.string().min(3).max(64),
});

const schemaPOST = z.object({
  id: z.string().refine(isoBase64URL.isBase64URL),
  rawId: z.string().refine(isoBase64URL.isBase64URL),
  response: z.object({
    clientDataJSON: z.string().refine(isoBase64URL.isBase64URL),
    attestationObject: z.string().refine(isoBase64URL.isBase64URL),
    authenticatorData: z.string().refine(isoBase64URL.isBase64URL).optional(),
    transports: z
      .enum(['ble', 'cable', 'hybrid', 'internal', 'nfc', 'smart-card', 'usb'])
      .array()
      .optional(),
    publicKeyAlgorithm: z.number().optional(),
    publicKey: z.string().refine(isoBase64URL.isBase64URL).optional(),
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
}) satisfies z.ZodSchema<RegistrationResponseJSON>;

/**
 * @openapi
 * /api/auth/register:
 *   head:
 *     description: Check if a user exists
 *     tags: [auth]
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: user
 *         description: User's name
 *         in: query
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: User exists
 */
export const HEAD = pipe(
  validateSearch(schemaParams),
  async (req: NextRequest & {data: z.infer<typeof schemaParams>}) => {
    const {user} = req.data;
    const userExists = await users.exists(user);
    if (userExists) return NextResponse.json({error: 'user exists'}, {status: 400});

    return NextResponse.json(null, {status: 200});
  },
);

/**
 * @openapi
 * /api/auth/register:
 *   get:
 *     description: Start the registration process for a new user
 *     tags: [auth]
 *     security:
 *       - BearerAuth: []
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: user
 *         description: User id
 *         in: query
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: User exists
 */
export const GET = pipe(
  validateSearch(schemaParams),
  async (req: NextRequest & {data: z.infer<typeof schemaParams>}) => {
    const {user} = req.data;
    const auth = req.headers.get('authorization')?.startsWith('Bearer ')
      ? req.headers.get('authorization')?.split(' ')[1]
      : null;

    const existingUser = await users.get(user);
    const authUser = auth
      ? jwt.verify<{user: {id: string; name?: string}}>('access', auth).user
      : null;
    if (existingUser.id !== authUser?.id)
      return NextResponse.json({error: 'user exists'}, {status: 400});

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: user,
      timeout: 60000,
      // Don't prompt users for additional information about the authenticator.
      attestationType: 'none',
      // Exclude existing credentials from the list of allowed credentials.
      excludeCredentials: existingUser.passkeys.map(passkey => ({
        id: passkey.credentialID,
        type: 'public-key',
        transports: passkey.transports,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
      supportedAlgorithmIDs: [-7, -257],
    });
    console.log(options);

    const stored = await challenges.set({
      origin,
      id: options.user.id,
      user: options.user.name,
      challenge: options.challenge,
      timeout: options.timeout,
    });
    if (!stored) return NextResponse.json({error: 'registration error'}, {status: 400});

    return NextResponse.json(options, {status: 200});
  },
);

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     description: Register a new user with a WebAuthn credential
 *     tags: [auth]
 *     security:
 *       - BearerAuth: []
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *         headers:
 *           Set-Cookie:
 *             description: Refresh token
 *             schema:
 *               type: string
 *               example: refresh-token=abcde12345; Path=/; HttpOnly
 *       400:
 *         description: Registration error
 */
export const POST = pipe(
  validateBody(schemaPOST),
  async (req: NextRequest & {data: z.infer<typeof schemaPOST>}) => {
    const {data} = req;
    const auth = req.headers.get('authorization')?.startsWith('Bearer ')
      ? req.headers.get('authorization')?.split(' ')[1]
      : null;

    // Ensure this challenge is valid
    const validChallenge = await challenges.getdel(
      decodeClientDataJSON(data.response.clientDataJSON).challenge,
    );
    if (!validChallenge || !validChallenge.id) {
      console.log('Registration error', validChallenge);
      return NextResponse.json({error: 'registration error'}, {status: 400});
    }

    // Allow the user to update their registration if they are the owner of the account
    const userExists = await users.exists(validChallenge.id);
    // TODO: Need wrapper around jwt.verify to handle errors
    const isOwner = auth
      ? jwt.verify<{user: {id: string; name?: string}}>('access', auth).user.id ===
        validChallenge.id
      : false;
    if (userExists && !isOwner) return NextResponse.json({error: 'user exists'}, {status: 400});

    // Verify the registration response
    let assertion: VerifiedRegistrationResponse | null = null;
    try {
      assertion = await verifyRegistrationResponse({
        response: data,
        expectedChallenge: validChallenge.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });
    } catch (e) {
      console.log('Registration error', e);
    }
    if (!(assertion && assertion.verified && assertion.registrationInfo)) {
      return NextResponse.json({error: 'registration error'}, {status: 400});
    }

    console.log('Registration successful', assertion);

    // Update the user's passkeys if this is a new registration, otherwise check the existing passkey is valid
    const user = await users.get(validChallenge.id, validChallenge.user);
    const existing = user.passkeys.find(
      passkey => passkey.credentialID === assertion?.registrationInfo?.credentialID,
    );
    if (existing) {
      const allow =
        existing.credentialPublicKey === assertion.registrationInfo.credentialPublicKey &&
        existing.counter <= assertion.registrationInfo.counter;
      if (!allow) return NextResponse.json({error: 'registration error'}, {status: 400});
    } else {
      const update = await users.set({
        ...user,
        id: validChallenge.id,
        name: validChallenge.user,
        passkeys: [
          ...user.passkeys,
          {
            credentialID: assertion.registrationInfo.credentialID,
            credentialPublicKey: assertion.registrationInfo.credentialPublicKey,
            counter: assertion.registrationInfo.counter,
            transports: data.response.transports ?? [],
          },
        ],
      });
      if (!update) return NextResponse.json({error: 'registration error'}, {status: 400});
    }

    cookies().set('refresh-token', jwt.token('refresh', {user: {id: user.id, name: user.name}}), {
      httpOnly: true,
      sameSite: 'strict',
    });

    return NextResponse.json(
      {token: jwt.token('access', {user: {id: user.id, name: user.name}})},
      {status: 200},
    );
  },
);
