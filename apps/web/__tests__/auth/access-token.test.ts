import { describe, expect, test } from 'vitest';
import { isUnexpired } from '@/features/auth/access-token';
import { fakeJwt } from './fake-jwt';

const NOW = Date.UTC(2026, 10, 18, 12, 0, 0);
const nowInSeconds = NOW / 1000;

describe('isUnexpired', () => {
  test('a token whose exp is in the future is unexpired', () => {
    expect(isUnexpired(fakeJwt({ exp: nowInSeconds + 60 }), NOW)).toBe(true);
  });

  test('a token whose exp has passed is expired', () => {
    expect(isUnexpired(fakeJwt({ exp: nowInSeconds - 60 }), NOW)).toBe(false);
  });

  test('a token expiring right now is expired', () => {
    expect(isUnexpired(fakeJwt({ exp: nowInSeconds }), NOW)).toBe(false);
  });

  test('a token without an exp claim counts as expired', () => {
    expect(isUnexpired(fakeJwt({ sub: 'usr_1' }), NOW)).toBe(false);
  });

  test.each([
    ['an empty string', ''],
    ['no payload segment', 'header-only'],
    ['a payload that is not base64', 'a.@@@.c'],
    ['a payload that is not JSON', `a.${btoa('not json')}.c`],
    ['a JSON null payload', `a.${btoa('null')}.c`],
    ['a non-numeric exp', fakeJwt({ exp: 'tomorrow' })],
  ])('a malformed token (%s) counts as expired', (_, token) => {
    expect(isUnexpired(token, NOW)).toBe(false);
  });
});
