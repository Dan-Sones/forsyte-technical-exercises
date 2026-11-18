import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import { LoginError } from '@/features/auth/login-request';
import {
  mockLoginApi,
  mockLoginNetworkError,
  mockLoginResponse,
  SEEDED_USER,
} from './api';
import { expiredToken, validToken } from './fake-jwt';

const STORAGE_KEY = 'ask-forsyte-access-token';

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

async function loginError(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e
  );
  expect(error).toBeInstanceOf(LoginError);
  return (error as LoginError).kind;
}

describe('useAuth', () => {
  test('starts signed out when nothing is stored', () => {
    const { result } = renderAuth();

    expect(result.current.status).toBe('unauthenticated');
  });

  test('restores an unexpired token from sessionStorage', () => {
    const token = validToken();
    sessionStorage.setItem(STORAGE_KEY, token);

    const { result } = renderAuth();

    expect(result.current).toMatchObject({
      status: 'authenticated',
      accessToken: token,
    });
  });

  test('discards an expired stored token', () => {
    sessionStorage.setItem(STORAGE_KEY, expiredToken());

    const { result } = renderAuth();

    expect(result.current.status).toBe('unauthenticated');
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  test('discards a stored token it cannot read', () => {
    sessionStorage.setItem(STORAGE_KEY, 'not-a-jwt');

    const { result } = renderAuth();

    expect(result.current.status).toBe('unauthenticated');
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  test('login posts the credentials and stores the returned token', async () => {
    const api = mockLoginApi();
    const { result } = renderAuth();

    await act(() =>
      result.current.login(SEEDED_USER.email, SEEDED_USER.password)
    );

    expect(api.requests).toEqual([SEEDED_USER]);
    expect(result.current).toMatchObject({
      status: 'authenticated',
      accessToken: api.token,
    });
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe(api.token);
  });

  test('a rejected login stays signed out', async () => {
    mockLoginApi();
    const { result } = renderAuth();

    const kind = await loginError(
      result.current.login(SEEDED_USER.email, 'wrong-password')
    );

    expect(kind).toBe('invalid-credentials');
    expect(result.current.status).toBe('unauthenticated');
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  test.each([
    [400, { message: ['email must be an email'] }, 'invalid-credentials'],
    [401, { message: 'Invalid email or password' }, 'invalid-credentials'],
    [500, { message: 'Internal server error' }, 'unexpected'],
    [503, {}, 'unexpected'],
    [201, {}, 'unexpected'],
    [201, { accessToken: '' }, 'unexpected'],
  ])(
    'a %i response with %j rejects with %s',
    async (status, body, expected) => {
      mockLoginResponse(status, body);
      const { result } = renderAuth();

      const kind = await loginError(
        result.current.login(SEEDED_USER.email, SEEDED_USER.password)
      );

      expect(kind).toBe(expected);
      expect(result.current.status).toBe('unauthenticated');
    }
  );

  test('an unreachable API rejects with a network error', async () => {
    mockLoginNetworkError();
    const { result } = renderAuth();

    const kind = await loginError(
      result.current.login(SEEDED_USER.email, SEEDED_USER.password)
    );

    expect(kind).toBe('network');
  });

  test('logout clears the session and storage', async () => {
    sessionStorage.setItem(STORAGE_KEY, validToken());
    const { result } = renderAuth();

    act(() => result.current.logout());

    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  test('throws outside an AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within <AuthProvider>.'
    );
  });
});
