// @vitest-environment node
import * as Sentry from '@sentry/nextjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from '@/lib/observability';
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
    vi.restoreAllMocks();
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

  describe('Better Stack on production', () => {
    beforeEach(() => {
      vi.stubEnv('NEXT_RUNTIME', 'nodejs');
      vi.stubEnv('VERCEL_ENV', 'production');
    });

    it('warns at boot when its log source is not configured', async () => {
      vi.stubEnv('BETTERSTACK_SOURCE_URL', '');
      vi.stubEnv('BETTERSTACK_SOURCE_TOKEN', '');
      const warn = vi.spyOn(logger, 'warn');

      await register();

      expect(warn).toHaveBeenCalledWith(
        { missing: ['BETTERSTACK_SOURCE_URL', 'BETTERSTACK_SOURCE_TOKEN'] },
        'better_stack_logs_not_configured',
      );
    });

    it('stays quiet when the log source is configured', async () => {
      vi.stubEnv('BETTERSTACK_SOURCE_URL', 'https://in.logs.betterstack.example');
      vi.stubEnv('BETTERSTACK_SOURCE_TOKEN', 'source-token');
      const warn = vi.spyOn(logger, 'warn');

      await register();

      expect(warn).not.toHaveBeenCalled();
    });

    it('stays quiet off production', async () => {
      vi.stubEnv('VERCEL_ENV', 'preview');
      vi.stubEnv('BETTERSTACK_SOURCE_URL', '');
      vi.stubEnv('BETTERSTACK_SOURCE_TOKEN', '');
      const warn = vi.spyOn(logger, 'warn');

      await register();

      expect(warn).not.toHaveBeenCalled();
    });
  });
});
