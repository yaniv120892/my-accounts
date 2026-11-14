import { createNextObservability } from '@yaniv120892/observability/next';

import type { FailureReport } from './observability.types';

/**
 * Logs, Sentry, Telegram ops alerts and health routes, shared with the other
 * "My" apps. Log an event name as the message and the details as fields —
 * `logger.warn({ route }, 'cross_site_request_refused')` — and pass an
 * unexpected error as `err` so its stack is kept.
 *
 * A Prisma error's message quotes the query's arguments, an email address
 * included, and a failed CHECK quotes the whole row, notes and address too:
 * the package keeps only its code, in logs, Sentry and alerts, by default.
 */
export const observability = createNextObservability({ service: 'my-accounts' });
export const { logger } = observability;

/** A failure the owner must act on: reported to Sentry and alerted on Telegram. */
export function reportAndAlert({
  error,
  where,
  context,
  alertType,
  alertTitle,
}: FailureReport): void {
  observability.reportError({ error, where, context });
  observability.scheduleOpsAlert({ alertType, title: alertTitle, error });
}
