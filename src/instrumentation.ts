import type { ObservabilityConfig } from '@yaniv120892/observability';
import type { Instrumentation } from 'next';

import type { logger } from '@/lib/observability';

type LogSourceCheck = { config: ObservabilityConfig; logger: typeof logger };

const REQUIRED_ENV_VARS = ['DATABASE_URL', 'BETTER_AUTH_SECRET'];
const BETTER_STACK_ENV_VARS = ['BETTERSTACK_SOURCE_URL', 'BETTERSTACK_SOURCE_TOKEN'];

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
    warnWhenProductionLogsStayLocal({ config: loadObservabilityConfig(), logger });
  }
}

/**
 * Without a log source, production logs reach only the platform's runtime logs, where the suite's
 * log checks never look. Logging still works, so this warns instead of failing the boot.
 */
function warnWhenProductionLogsStayLocal({ config, logger }: LogSourceCheck): void {
  const isLocalDevServer = process.env.NODE_ENV === 'development';
  const productionLogsStayLocal =
    config.environment === 'production' && !isLocalDevServer && config.betterStack === null;
  if (!productionLogsStayLocal) {
    return;
  }
  const missing = BETTER_STACK_ENV_VARS.filter((name) => !process.env[name]?.trim());
  logger.warn({ missing }, 'better_stack_logs_not_configured');
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
