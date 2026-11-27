import type { ObservabilityConfig } from '@yaniv120892/observability';
import type { Instrumentation } from 'next';

import type { logger } from '@/lib/observability';

type IntegrationCheck = { config: ObservabilityConfig; logger: typeof logger };

type ProductionIntegration = { event: string; envVars: string[] };

const REQUIRED_ENV_VARS = ['DATABASE_URL', 'BETTER_AUTH_SECRET'];

/**
 * Each one is off when its variables are unset, which on production means an error or a log line
 * reaches no one, silently. The boot names what is missing instead. Each lists the variables the
 * code that uses it reads: `initSentry` reads only `NEXT_PUBLIC_SENTRY_DSN`, not `SENTRY_DSN`.
 */
const PRODUCTION_INTEGRATIONS: ProductionIntegration[] = [
  {
    event: 'better_stack_logs_not_configured',
    envVars: ['BETTERSTACK_SOURCE_URL', 'BETTERSTACK_SOURCE_TOKEN'],
  },
  {
    event: 'sentry_errors_not_configured',
    envVars: ['NEXT_PUBLIC_SENTRY_DSN'],
  },
  {
    event: 'telegram_alerts_not_configured',
    envVars: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_ALERT_CHAT_ID'],
  },
];

/**
 * The settings the server cannot run without fail the boot, not the first request. Every other
 * variable has a default that leaves its feature off.
 */
export async function register(): Promise<void> {
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}.`);
  }

  const { initSentry } = await import('@yaniv120892/observability/next/sentry');
  initSentry();

  // Imported inside the branch Next drops from the Edge build, like onRequestError below.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const [{ loadObservabilityConfig }, { logger }] = await Promise.all([
      import('@yaniv120892/observability'),
      import('@/lib/observability'),
    ]);
    warnAboutUnconfiguredIntegrations({ config: loadObservabilityConfig(), logger });
  }
}

/**
 * Logging still works without these, so a missing one warns instead of failing the boot. Off
 * production they are optional.
 */
function warnAboutUnconfiguredIntegrations({ config, logger }: IntegrationCheck): void {
  const isLocalDevServer = process.env.NODE_ENV === 'development';
  if (config.environment !== 'production' || isLocalDevServer) {
    return;
  }
  for (const { event, envVars } of PRODUCTION_INTEGRATIONS) {
    const missing = envVars.filter((name) => !process.env[name]?.trim());
    if (missing.length > 0) {
      logger.warn({ missing }, event);
    }
  }
}

/**
 * Errors that escape a route — a server component, a route handler that throws, the proxy —
 * reach Next here. `redirect()` and `notFound()` do not.
 */
export const onRequestError: Instrumentation.onRequestError = async (...requestErrorArguments) => {
  // Next inlines NEXT_RUNTIME per bundle, so the Edge build drops the branch that imports pino,
  // which needs Node streams.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { observability } = await import('@/lib/observability');
    await observability.onRequestError(...requestErrorArguments);
  } else {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureRequestError(...requestErrorArguments);
  }
};
