import { describe, expect, it } from 'vitest';

import { parseCreateClientArguments } from './createClientArguments';

describe('parseCreateClientArguments', () => {
  it('reads the name, every redirect URI and the owner', () => {
    expect(
      parseCreateClientArguments([
        '--name',
        'Park',
        '--redirect-uri',
        'https://park.test/api/auth/accounts/callback',
        '--redirect-uri',
        'http://localhost:3001/api/auth/accounts/callback',
        '--owner',
        ' Owner@Example.com ',
      ]),
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
    expect(() => parseCreateClientArguments(['--name', 'Park', '--owner', 'o@x.test'])).toThrow(
      /Usage: npm run clients:create/,
    );
  });

  it('refuses a redirect URI that is not an absolute URL', () => {
    expect(() =>
      parseCreateClientArguments([
        '--name',
        'Park',
        '--redirect-uri',
        '/api/auth/accounts/callback',
        '--owner',
        'o@x.test',
      ]),
    ).toThrow(/must be an absolute URL/);
  });
});
