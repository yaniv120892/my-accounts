import { describe, expect, it } from 'vitest';

import {
  codeErrorMessageKey,
  codeRequestErrorMessageKey,
  nextLocationAfterSignIn,
} from '@/lib/signInOutcome';

describe('nextLocationAfterSignIn', () => {
  it('follows the redirect an authorize in progress answers with', () => {
    expect(
      nextLocationAfterSignIn({ redirect: true, url: 'https://park.test/cb?code=abc&state=s' }),
    ).toBe('https://park.test/cb?code=abc&state=s');
  });

  it('lands on the account page after a direct sign-in', () => {
    expect(nextLocationAfterSignIn({ token: 't', user: { id: 'u' } })).toBe('/');
    expect(nextLocationAfterSignIn({ redirect: false, url: 'https://park.test' })).toBe('/');
    expect(nextLocationAfterSignIn(null)).toBe('/');
  });
});

describe('codeErrorMessageKey', () => {
  it.each([
    [{ status: 400, code: 'INVALID_OTP' }, 'auth.error.codeInvalid'],
    [{ status: 400, code: 'OTP_EXPIRED' }, 'auth.error.codeInvalid'],
    [{ status: 403, code: 'TOO_MANY_ATTEMPTS' }, 'auth.error.tooManyAttempts'],
    [{ status: 429 }, 'auth.error.rateLimited'],
    [{ status: 500 }, 'auth.error.signInFailed'],
  ] as const)('%j is %s', (error, key) => {
    expect(codeErrorMessageKey(error)).toBe(key);
  });
});

describe('codeRequestErrorMessageKey', () => {
  it('tells a rate-limited network apart from a bad address', () => {
    expect(codeRequestErrorMessageKey({ status: 429 })).toBe('auth.error.rateLimited');
    expect(codeRequestErrorMessageKey({ status: 400 })).toBe('auth.error.requestFailed');
  });
});
