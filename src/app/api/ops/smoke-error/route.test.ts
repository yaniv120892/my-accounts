// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from '@/lib/observability';
import { OpsSmokeError } from '@/lib/opsSmokeError';
import { OPS_SMOKE_ADDRESS_RATE_LIMIT } from '@/lib/rateLimits';

import { POST } from './route';

const SECRET = 'ops-smoke-test-secret';
const ROUTE_URL = 'https://accounts.example/api/ops/smoke-error';

function smokeRequest(authorization?: string): Request {
  const headers = new Headers();
  if (authorization) {
    headers.set('authorization', authorization);
  }
  return new Request(ROUTE_URL, { method: 'POST', headers });
}

describe('POST /api/ops/smoke-error', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each([
    ['empty', ''],
    ['whitespace only', '   '],
  ])('answers 404 while OPS_SMOKE_SECRET is %s', async (_label, value) => {
    vi.stubEnv('OPS_SMOKE_SECRET', value);

    const response = await POST(smokeRequest(`Bearer ${SECRET}`));

    expect(response.status).toBe(404);
  });

  it.each([
    ['no authorization header', undefined],
    ['a wrong secret', 'Bearer not-the-secret'],
    ['the secret without the Bearer scheme', SECRET],
  ])('refuses %s', async (_label, authorization) => {
    vi.stubEnv('OPS_SMOKE_SECRET', SECRET);

    const warn = vi.spyOn(logger, 'warn');

    const response = await POST(smokeRequest(authorization));

    expect(response.status).toBe(401);
    expect(warn).toHaveBeenCalledWith('ops_smoke_unauthorized');
  });

  it('fails on purpose with the secret, so the 5xx path reports and alerts it', async () => {
    vi.stubEnv('OPS_SMOKE_SECRET', SECRET);

    await expect(POST(smokeRequest(`Bearer ${SECRET}`))).rejects.toBeInstanceOf(OpsSmokeError);
  });

  describe('with a counter store', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetModules();
    });

    it('refuses an address past the hourly limit before checking the secret', async () => {
      vi.stubEnv('OPS_SMOKE_SECRET', SECRET);
      vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://counter-store.example');
      vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'counter-store-token');
      vi.stubGlobal('fetch', fakeCounterStore());
      vi.resetModules();
      const route = await import('./route');

      const statuses: number[] = [];
      for (let request = 0; request <= OPS_SMOKE_ADDRESS_RATE_LIMIT.limit; request++) {
        statuses.push((await route.POST(smokeRequest('Bearer not-the-secret'))).status);
      }

      expect(statuses.slice(0, -1).every((status) => status === 401)).toBe(true);
      expect(statuses.at(-1)).toBe(429);
    });
  });
});

/** Upstash's `multi-exec` reply to INCR + EXPIRE, counting per key like the real store. */
function fakeCounterStore(): typeof fetch {
  const counts = new Map<string, number>();
  return async function countIncrement(_url, init) {
    const commands: unknown = JSON.parse(String(init?.body));
    const key = Array.isArray(commands) && Array.isArray(commands[0]) ? String(commands[0][1]) : '';
    const hits = (counts.get(key) ?? 0) + 1;
    counts.set(key, hits);
    return Response.json([{ result: hits }, { result: 1 }]);
  };
}
