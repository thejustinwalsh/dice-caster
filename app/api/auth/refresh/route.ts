import {cookies} from 'next/headers';
import {NextRequest, NextResponse} from 'next/server';

import {users} from '@/db';
import * as jwt from '@/lib/jwt';

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     description: Refresh the access token
 *     tags: [auth]
 *     security:
 *       - cookieAuth: []
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
 *       401:
 *         description: Unauthorized
 */
export const POST = async (req: NextRequest) => {
  const token = cookies().get('refresh-token')?.value;
  if (!token) return NextResponse.json({}, {status: 401});

  let user: {id: string; name?: string} | undefined = undefined;
  try {
    user = jwt.verify<{user: {id: string; name?: string}}>('refresh', token).user;
  } catch (error) {
    console.error('Refresh token error', error);
  }
  if (!user) return NextResponse.json({}, {status: 401});

  const userExists = await users.exists(user.id);
  if (!userExists) return NextResponse.json({}, {status: 401});

  cookies().set('refresh-token', jwt.token('refresh', {user: {id: user.id, name: user.name}}), {
    httpOnly: true,
    sameSite: 'strict',
  });

  return NextResponse.json(
    {token: jwt.token('access', {user: {id: user.id, name: user.name}})},
    {status: 200},
  );
};
