function base64url(value: object) {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** An unsigned JWT with the given claims. The app only reads `exp`. */
export function fakeJwt(claims: Record<string, unknown>) {
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(claims)}.signature`;
}

const nowInSeconds = () => Math.floor(Date.now() / 1000);

/** A token that expires in a day, like the API's. */
export const validToken = () =>
  fakeJwt({ sub: 'usr_buzz', exp: nowInSeconds() + 24 * 60 * 60 });

export const expiredToken = () =>
  fakeJwt({ sub: 'usr_buzz', exp: nowInSeconds() - 60 });
