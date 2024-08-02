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
export const GET = pipe(
  validateSearch(schemaParams),
  async (req: NextRequest & {data: z.infer<typeof schemaParams>}) => {
    const {user} = req.data;

    // TODO: We can only update a user if that user has a JWT for their account giving them permission to update
    // TODO: Without a JWT we can only create new users
    const userExists = await users.exists(user);
    if (userExists) return NextResponse.json({error: 'user exists'}, {status: 400});

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: user,
      timeout: 60000,
      // Don't prompt users for additional information about the authenticator.
      attestationType: 'none',
      // TODO: excludeCredentials: user.passkeys.map(passkey => ({id: passkey.credentialID, type: 'public-key', transports: passkey.transports})),
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
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: Registration error
 */
export const POST = pipe(
  validateBody(schemaPOST),
  async (req: NextRequest & {data: z.infer<typeof schemaPOST>}) => {
    const {data} = req;

    // Ensure this challenge is valid
    const validChallenge = await challenges.getdel(
      decodeClientDataJSON(data.response.clientDataJSON).challenge,
    );
    if (!validChallenge || !validChallenge.id) {
      console.log('Registration error', validChallenge);
      return NextResponse.json({error: 'registration error'}, {status: 400});
    }

    // TODO: We can only update a user if that user has a JWT for their account giving them permission to update
    // TODO: Without a JWT we can only create new users
    const userExists = await users.exists(validChallenge.id);
    if (userExists) return NextResponse.json({error: 'user exists'}, {status: 400});

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

    // TODO: Return a JWT token that can be used to access protected resources
    return NextResponse.json({}, {status: 200});
  },
);
