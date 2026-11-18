/**
 * Whether a JWT's `exp` claim is still in the future. The signature is not
 * checked (that is the API's job); this only stops the app restoring a token
 * it already knows is dead. A token without a readable `exp` counts as
 * expired.
 */
export function isUnexpired(token: string, nowMs: number): boolean {
  const exp = readExpiry(token);
  return exp !== null && exp * 1000 > nowMs;
}

function readExpiry(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const { exp } = JSON.parse(atob(padded));
    return typeof exp === 'number' ? exp : null;
  } catch {
    return null;
  }
}
