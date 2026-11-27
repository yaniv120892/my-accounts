import type { Instrumentation } from 'next';

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

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await warnWhenProductionLogsStayLocal();
  }
}

/**
 * Without a Better Stack source, production logs reach only the Vercel runtime logs, where the
 * suite's log checks never look. Logging still works, so this warns instead of failing the boot.
 */
async function warnWhenProductionLogsStayLocal(): Promise<void> {
  if (process.env.VERCEL_ENV !== 'production') {
    return;
  }
  const missing = BETTER_STACK_ENV_VARS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    const { logger } = await import('@/lib/observability');
    logger.warn({ missing }, 'better_stack_logs_not_configured');
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
