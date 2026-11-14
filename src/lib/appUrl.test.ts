import { describe, expect, it } from 'vitest';

import { appBaseUrl, appOrigins } from '@/lib/appUrl';

describe('appBaseUrl', () => {
  it('prefers the configured URL, without a trailing slash', () => {
    expect(
      appBaseUrl({ BETTER_AUTH_URL: 'https://accounts.example/', VERCEL_ENV: 'production' }),
    ).toBe('https://accounts.example');
  });

  it("falls back to production's own domain when unset there", () => {
    expect(
      appBaseUrl({
        VERCEL_ENV: 'production',
        VERCEL_PROJECT_PRODUCTION_URL: 'my-accounts.vercel.app',
        VERCEL_URL: 'my-accounts-abc123.vercel.app',
      }),
    ).toBe('https://my-accounts.vercel.app');
  });

  it("falls back to a preview's branch address", () => {
    expect(
      appBaseUrl({
        VERCEL_ENV: 'preview',
        VERCEL_BRANCH_URL: 'my-accounts-git-feat.vercel.app',
        VERCEL_URL: 'my-accounts-abc123.vercel.app',
      }),
    ).toBe('https://my-accounts-git-feat.vercel.app');
  });

  it('is localhost with nothing set', () => {
    expect(appBaseUrl({})).toBe('http://localhost:3000');
  });
});

describe('appOrigins', () => {
  it('trusts a preview on its branch address and its per-deployment address', () => {
    expect(
      appOrigins({
        VERCEL_ENV: 'preview',
        VERCEL_BRANCH_URL: 'my-accounts-git-feat.vercel.app',
        VERCEL_URL: 'my-accounts-abc123.vercel.app',
      }),
    ).toEqual(['https://my-accounts-git-feat.vercel.app', 'https://my-accounts-abc123.vercel.app']);
  });

  it('is the one public origin off a deployment', () => {
    expect(appOrigins({ BETTER_AUTH_URL: 'http://localhost:3000' })).toEqual([
      'http://localhost:3000',
    ]);
  });
});
