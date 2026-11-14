import { describe, expect, it } from 'vitest';

import { appBaseUrl } from '@/lib/appUrl';

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
