// @vitest-environment node
import * as Sentry from '@sentry/nextjs';
import { initSentry } from '@yaniv120892/observability/next/sentry';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  QUOTED_EMAIL,
  expectNoQuotedData,
  prismaErrorQuotingData,
} from '@/test/helpers/prismaErrors';
import { enableSentry, sentEnvelopes, sentPayloads } from '@/test/helpers/sentryCapture';

import { observability } from './observability';

vi.mock('@sentry/nextjs', async (importOriginal) => {
  const { sentryWithCapturedTransport } = await import('@/test/helpers/sentryCapture');
  return sentryWithCapturedTransport(importOriginal);
});

describe('observability', () => {
  beforeAll(() => {
    enableSentry();
    // As instrumentation starts it, with no errorMessage: the package's
    // default withholding is all that keeps the error's data out of the log
    // line and Sentry.
    initSentry();
  });

  afterEach(() => {
    sentEnvelopes.length = 0;
  });

  it('logs and reports a Prisma error without the data its message quotes', async () => {
    const logLines = captureStdout();
    const error = prismaErrorQuotingData();

    observability.reportError({
      error,
      where: 'sign_in_mail_failed',
      context: { userId: 'user-1' },
    });
    await Sentry.flush(2_000);

    const [logLine] = logLines;
    expect(logLine).toContain('sign_in_mail_failed');
    expect(logLine).toContain('P2010');
    expectNoQuotedData(logLine ?? '');

    const payload = sentPayloads();
    expect(payload).toContain('sign_in_mail_failed');
    expect(payload).toContain('P2010');
    expectNoQuotedData(payload);
  });

  it('lets an ordinary error message through', async () => {
    captureStdout();
    observability.reportError({ error: new Error(`SMTP refused ${QUOTED_EMAIL}`), where: 'probe' });
    await Sentry.flush(2_000);

    expect(sentPayloads()).toContain(QUOTED_EMAIL);
  });
});

function captureStdout(): string[] {
  const lines: string[] = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    lines.push(String(chunk));
    return true;
  });
  return lines;
}
