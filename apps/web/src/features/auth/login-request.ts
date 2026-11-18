import { API_BASE_URL } from '@/lib/api-config';

export type LoginErrorKind = 'invalid-credentials' | 'network' | 'unexpected';

export class LoginError extends Error {
  constructor(readonly kind: LoginErrorKind) {
    super(`Login failed: ${kind}`);
    this.name = 'LoginError';
  }
}

/**
 * Exchanges an email and password for an access token via POST /auth/login.
 * Rejects with a LoginError describing why it failed.
 */
export async function requestAccessToken(
  email: string,
  password: string
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new LoginError('network');
  }

  // 401 is a wrong email or password. 400 is input the API's validation
  // rejected (a malformed email or an empty password), which to the user is
  // the same problem.
  if (response.status === 401 || response.status === 400) {
    throw new LoginError('invalid-credentials');
  }
  if (!response.ok) {
    throw new LoginError('unexpected');
  }

  const body: unknown = await response.json().catch(() => null);
  if (!hasAccessToken(body)) {
    throw new LoginError('unexpected');
  }
  return body.accessToken;
}

function hasAccessToken(body: unknown): body is { accessToken: string } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'accessToken' in body &&
    typeof body.accessToken === 'string' &&
    body.accessToken !== ''
  );
}
