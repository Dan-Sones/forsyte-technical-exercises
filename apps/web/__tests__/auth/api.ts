import { delay, http, HttpResponse, type JsonBodyType } from 'msw';
import { API_BASE_URL } from '@/lib/api-config';
import { server } from '../msw-server';
import { validToken } from './fake-jwt';

export const SEEDED_USER = {
  email: 'buzz.aldrin@forsyte.co',
  password: 'beeCompliant33',
};

const LOGIN_URL = `${API_BASE_URL}/auth/login`;

/**
 * Stands in for POST /auth/login: the seeded user gets a token, anyone else
 * a 401. Returns the request bodies it received.
 */
export function mockLoginApi(token = validToken()) {
  const requests: unknown[] = [];
  server.use(
    http.post(LOGIN_URL, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      requests.push(body);
      if (
        body.email === SEEDED_USER.email &&
        body.password === SEEDED_USER.password
      ) {
        return HttpResponse.json({ accessToken: token }, { status: 201 });
      }
      return HttpResponse.json(
        { message: 'Invalid email or password', statusCode: 401 },
        { status: 401 }
      );
    })
  );
  return { requests, token };
}

export function mockLoginResponse(status: number, body: JsonBodyType = {}) {
  server.use(http.post(LOGIN_URL, () => HttpResponse.json(body, { status })));
}

export function mockLoginNetworkError() {
  server.use(http.post(LOGIN_URL, () => HttpResponse.error()));
}

/** Login requests never answer, so the pending state can be checked. */
export function mockLoginHangs() {
  server.use(http.post(LOGIN_URL, () => delay('infinite')));
}
