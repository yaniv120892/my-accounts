import { createHash } from 'node:crypto';

import { withholdPrismaMessages } from '@yaniv120892/observability';

const LOG_HASH_LENGTH = 12;

export function hashForLog(value: string): string {
  return createHash('sha256')
    .update(value.trim().toLowerCase())
    .digest('hex')
    .slice(0, LOG_HASH_LENGTH);
}

/**
 * For a log line that keeps an error out of Sentry. A Prisma error message
 * quotes the query's arguments, an email address included, so only its code
 * is logged.
 */
export function errorFields(error: unknown): { errorName: string; errorMessage: string } {
  if (error instanceof Error) {
    return { errorName: error.name, errorMessage: withholdPrismaMessages(error) };
  }
  return { errorName: 'NonError', errorMessage: String(error) };
}

/**
 * A mail server's rejection can quote the recipient ("550 <dana@…> rejected"),
 * so a send failure is logged by its codes alone.
 */
export function mailErrorFields(error: unknown): {
  errorName: string;
  errorCode: string | null;
  smtpResponseCode: number | null;
} {
  if (!(error instanceof Error)) {
    return { errorName: 'NonError', errorCode: null, smtpResponseCode: null };
  }
  const errorCode = 'code' in error && typeof error.code === 'string' ? error.code : null;
  const smtpResponseCode =
    'responseCode' in error && typeof error.responseCode === 'number' ? error.responseCode : null;
  return { errorName: error.name, errorCode, smtpResponseCode };
}
