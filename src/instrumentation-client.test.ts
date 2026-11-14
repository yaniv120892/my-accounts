// @vitest-environment node
import * as Sentry from '@sentry/nextjs';
import { describe, expect, it, vi } from 'vitest';

import { expectNoQuotedData, prismaErrorQuotingData } from '@/test/helpers/prismaErrors';
import { enableSentry, sentPayloads } from '@/test/helpers/sentryCapture';

vi.mock('@sentry/nextjs', async (importOriginal) => {
  const { sentryWithCapturedTransport } = await import('@/test/helpers/sentryCapture');
  return sentryWithCapturedTransport(importOriginal);
});

// The SDK keeps the first init in a process, so this runs apart from the server's.
describe('instrumentation-client', () => {
  it('starts a Sentry that withholds what a Prisma error quotes', async () => {
    enableSentry();
    await import('./instrumentation-client');

    Sentry.captureException(prismaErrorQuotingData());
    await Sentry.flush(2_000);

    expect(sentPayloads()).toContain('P2010');
    expectNoQuotedData(sentPayloads());
  });
});
