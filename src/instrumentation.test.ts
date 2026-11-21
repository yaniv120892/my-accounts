// @vitest-environment node
import * as Sentry from '@sentry/nextjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { expectNoQuotedData, prismaErrorQuotingData } from '@/test/helpers/prismaErrors';
import { enableSentry, sentEnvelopes, sentPayloads } from '@/test/helpers/sentryCapture';

import { register } from './instrumentation';

vi.mock('@sentry/nextjs', async (importOriginal) => {
  const { sentryWithCapturedTransport } = await import('@/test/helpers/sentryCapture');
  return sentryWithCapturedTransport(importOriginal);
});

const REQUEST = { path: '/api/auth/sign-in/email-otp', method: 'POST', headers: {} };
const CONTEXT = {
  routerKind: 'App Router',
  routePath: '/api/auth/sign-in/email-otp',
  routeType: 'route',
  revalidateReason: undefined,
} as const;

describe('instrumentation', () => {
  beforeEach(() => {
    enableSentry();
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/my_accounts');
    vi.stubEnv('BETTER_AUTH_SECRET', 'instrumentation-test-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    sentEnvelopes.length = 0;
  });

  it('refuses to boot without the database or the session secret', async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', '');

    await expect(register()).rejects.toThrow('BETTER_AUTH_SECRET');
  });

  // Before the observability module exists, nothing but initSentry's default
  // withholding stands between an escaped Prisma error and Sentry.
  it('starts a server Sentry that withholds what a Prisma error quotes', async () => {
    await register();

    Sentry.captureRequestError(prismaErrorQuotingData(), REQUEST, CONTEXT);
    await Sentry.flush(2_000);

    expect(sentPayloads()).toContain('P2010');
    expectNoQuotedData(sentPayloads());
  });
});
