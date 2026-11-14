import { createHash } from 'node:crypto';

import type { MailErrorFields } from './logFields.types';

const LOG_HASH_LENGTH = 12;

export function hashForLog(value: string): string {
  return createHash('sha256')
    .update(value.trim().toLowerCase())
    .digest('hex')
    .slice(0, LOG_HASH_LENGTH);
}

/**
 * A mail server's rejection can quote the recipient ("550 <dana@…> rejected"),
 * so a send failure is logged by its codes alone.
 */
export function mailErrorFields(error: unknown): MailErrorFields {
  if (!(error instanceof Error)) {
    return { errorName: 'NonError', errorCode: null, smtpResponseCode: null };
  }
  const errorCode = 'code' in error && typeof error.code === 'string' ? error.code : null;
  const smtpResponseCode =
    'responseCode' in error && typeof error.responseCode === 'number' ? error.responseCode : null;
  return { errorName: error.name, errorCode, smtpResponseCode };
}
