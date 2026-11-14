import { describe, expect, it } from 'vitest';

import {
  allowsLocalDevelopmentRedirect,
  googleCredentials,
  identityClaims,
  signInMethodOf,
  trustedClientIds,
} from '@/lib/authSettings';

describe('trustedClientIds', () => {
  it('reads a comma-separated list, ignoring blanks and spaces', () => {
    expect(trustedClientIds({ TRUSTED_CLIENT_IDS: ' park, ,shopping ,' })).toEqual(
      new Set(['park', 'shopping']),
    );
  });

  it('trusts no one when unset', () => {
    expect(trustedClientIds({})).toEqual(new Set());
  });
});

describe('googleCredentials', () => {
  it('needs both the id and the secret', () => {
    expect(googleCredentials({ GOOGLE_CLIENT_ID: 'id' })).toBeNull();
    expect(googleCredentials({ GOOGLE_CLIENT_SECRET: 'secret' })).toBeNull();
    expect(googleCredentials({ GOOGLE_CLIENT_ID: ' ', GOOGLE_CLIENT_SECRET: 'secret' })).toBeNull();
  });

  it('returns the pair when both are set', () => {
    expect(googleCredentials({ GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret' })).toEqual({
      clientId: 'id',
      clientSecret: 'secret',
    });
  });
});

describe('allowsLocalDevelopmentRedirect', () => {
  const local = new URL('http://localhost:3001/api/auth/accounts/callback');

  it('allows a loopback http redirect on a developer machine', () => {
    expect(allowsLocalDevelopmentRedirect({ url: local, env: { NODE_ENV: 'development' } })).toBe(
      true,
    );
    expect(
      allowsLocalDevelopmentRedirect({ url: new URL('http://127.0.0.1:3001/cb'), env: {} }),
    ).toBe(true);
  });

  it('refuses it on any deployment', () => {
    expect(allowsLocalDevelopmentRedirect({ url: local, env: { NODE_ENV: 'production' } })).toBe(
      false,
    );
    expect(allowsLocalDevelopmentRedirect({ url: local, env: { VERCEL_ENV: 'preview' } })).toBe(
      false,
    );
  });

  it('refuses plain http to any other host', () => {
    expect(
      allowsLocalDevelopmentRedirect({
        url: new URL('http://192.168.1.5:3001/cb'),
        env: { NODE_ENV: 'development' },
      }),
    ).toBe(false);
  });
});

describe('signInMethodOf', () => {
  it.each([
    ['/sign-in/email-otp', 'email_code'],
    ['/callback/:id', 'google'],
    ['/sign-in/social', 'google'],
    ['/sign-in/anonymous', 'other'],
    [undefined, 'other'],
  ] as const)('%s is %s', (path, method) => {
    expect(signInMethodOf(path)).toBe(method);
  });
});

describe('identityClaims', () => {
  const user = {
    email: 'dana@example.com',
    emailVerified: true,
    name: 'Dana',
    image: 'https://img.test/d.png',
  };

  it('adds the email only with the email scope', () => {
    expect(identityClaims({ user, scopes: ['openid', 'email'] })).toEqual({
      email: 'dana@example.com',
      email_verified: true,
    });
    expect(identityClaims({ user, scopes: ['openid'] })).toEqual({});
  });

  it('adds the name and picture with the profile scope, leaving out an empty name', () => {
    expect(identityClaims({ user, scopes: ['openid', 'profile'] })).toEqual({
      name: 'Dana',
      picture: 'https://img.test/d.png',
    });
    expect(
      identityClaims({ user: { ...user, name: '', image: null }, scopes: ['profile'] }),
    ).toEqual({});
  });
});
