import * as jwt from 'jsonwebtoken';

export type TokenType = 'access' | 'refresh';

export function token<T extends Record<string, unknown>>(type: TokenType, payload: T) {
  const secret = type === 'access' ? process.env.JWT_ACCESS_SECRET : process.env.JWT_REFRESH_SECRET;
  if (secret === undefined) throw Error(`Invalid ${type} token`);

  const expiresIn =
    type === 'access'
      ? process.env.JWT_ACCESS_EXPIRES_IN ?? '1h'
      : process.env.JWT_REFRESH_EXPIRES_IN ?? '1d';

  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: expiresIn,
    notBefore: '2s',
  });
}

export function verify<T extends Record<string, unknown>>(type: TokenType, token: string): T {
  const secret = type === 'access' ? process.env.JWT_ACCESS_SECRET : process.env.JWT_REFRESH_SECRET;
  if (secret === undefined) throw Error(`Invalid ${type} token`);

  return jwt.verify(token, secret, {algorithms: ['HS256']}) as T;
}

export function refresh(refToken: string) {
  const payload = verify('refresh', refToken);
  return token('access', payload);
}
