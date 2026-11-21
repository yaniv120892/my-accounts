import type { Instrumentation } from 'next';

const REQUIRED_ENV_VARS = ['DATABASE_URL', 'BETTER_AUTH_SECRET'];

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
