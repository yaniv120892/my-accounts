import { describe, expect, it } from 'vitest';

import { parseCreateClientArguments } from './createClientArguments';

const LOCAL_ACCOUNTS = 'http://localhost:3000';
const DEPLOYED_ACCOUNTS = 'https://accounts.test';

describe('parseCreateClientArguments', () => {
  it('reads the name, every redirect URI and the owner', () => {
    expect(
      parseCreateClientArguments({
        argv: [
          '--name',
          'Park',
          '--redirect-uri',
          'https://park.test/api/auth/accounts/callback',
          '--redirect-uri',
          'http://localhost:3001/api/auth/accounts/callback',
          '--owner',
          ' Owner@Example.com ',
        ],
        accountsUrl: LOCAL_ACCOUNTS,
      }),
    ).toEqual({
      name: 'Park',
      redirectUris: [
        'https://park.test/api/auth/accounts/callback',
        'http://localhost:3001/api/auth/accounts/callback',
      ],
      ownerEmail: 'owner@example.com',
    });
  });

  it('refuses a missing argument with the usage line', () => {
    expect(() =>
      parseCreateClientArguments({
        argv: ['--name', 'Park', '--owner', 'o@x.test'],
        accountsUrl: DEPLOYED_ACCOUNTS,
      }),
    ).toThrow(/Usage: npm run clients:create/);
  });

  it('refuses a redirect URI that is not an absolute URL', () => {
    expect(() =>
      parseCreateClientArguments({
        argv: [
          '--name',
          'Park',
          '--redirect-uri',
          '/api/auth/accounts/callback',
          '--owner',
          'o@x.test',
        ],
        accountsUrl: DEPLOYED_ACCOUNTS,
      }),
    ).toThrow(/must be an absolute URL/);
  });

  it.each([
    ['a localhost redirect on a deployed accounts app', 'http://localhost:3001/callback'],
    ['a plain-http redirect to another host', 'http://park.test/callback'],
  ])('refuses %s', (_case, redirectUri) => {
    expect(() =>
      parseCreateClientArguments({
        argv: ['--name', 'Park', '--redirect-uri', redirectUri, '--owner', 'o@x.test'],
        accountsUrl: DEPLOYED_ACCOUNTS,
      }),
    ).toThrow(/must be https/);
  });
});
