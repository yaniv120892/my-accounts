// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OpsSmokeError } from '@/lib/opsSmokeError';

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
  });

  it('does not exist while OPS_SMOKE_SECRET is unset', async () => {
    vi.stubEnv('OPS_SMOKE_SECRET', '');

    const response = await POST(smokeRequest(`Bearer ${SECRET}`));

    expect(response.status).toBe(404);
  });

  it.each([
    ['no authorization header', undefined],
    ['a wrong secret', 'Bearer not-the-secret'],
    ['the secret without the Bearer scheme', SECRET],
  ])('refuses %s', async (_label, authorization) => {
    vi.stubEnv('OPS_SMOKE_SECRET', SECRET);

    const response = await POST(smokeRequest(authorization));

    expect(response.status).toBe(401);
  });

  it('fails on purpose with the secret, so the 5xx path reports and alerts it', async () => {
    vi.stubEnv('OPS_SMOKE_SECRET', SECRET);

    await expect(POST(smokeRequest(`Bearer ${SECRET}`))).rejects.toBeInstanceOf(OpsSmokeError);
  });
});
