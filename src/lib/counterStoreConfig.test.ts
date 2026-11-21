import { describe, expect, it } from 'vitest';

import { readCounterStoreConfig } from './counterStoreConfig';

const OWN = { UPSTASH_REDIS_REST_URL: 'https://own.test', UPSTASH_REDIS_REST_TOKEN: 'own-token' };
const MARKETPLACE = { KV_REST_API_URL: 'https://marketplace.test', KV_REST_API_TOKEN: 'kv-token' };

describe('readCounterStoreConfig', () => {
  it('reads the Vercel Marketplace names when the Upstash names are unset', () => {
    expect(readCounterStoreConfig(MARKETPLACE)).toEqual({
      url: 'https://marketplace.test',
      token: 'kv-token',
    });
  });

  it('reads the Marketplace names when the Upstash names are empty strings', () => {
    const env = { UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '', ...MARKETPLACE };

    expect(readCounterStoreConfig(env).url).toBe('https://marketplace.test');
  });

  it('prefers the Upstash names when both pairs are set', () => {
    expect(readCounterStoreConfig({ ...OWN, ...MARKETPLACE })).toEqual({
      url: 'https://own.test',
      token: 'own-token',
    });
  });

  it('never pairs one database URL with the other token', () => {
    const env = { UPSTASH_REDIS_REST_URL: 'https://own.test', ...MARKETPLACE };

    expect(readCounterStoreConfig(env)).toEqual({
      url: 'https://marketplace.test',
      token: 'kv-token',
    });
  });

  it('is unconfigured when neither pair is set', () => {
    expect(readCounterStoreConfig({})).toEqual({ url: undefined, token: undefined });
  });
});
