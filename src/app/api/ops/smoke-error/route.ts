import { isBearerAuthorized } from '@yaniv120892/app-kit/secrets';

import { logger } from '@/lib/observability';
import { OpsSmokeError } from '@/lib/opsSmokeError';
import { OPS_SMOKE_ADDRESS_RATE_LIMIT, refuseOverAddressLimit } from '@/lib/rateLimits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Fails on purpose, so an operator can prove a production 5xx reaches Sentry and the Telegram ops
 * alert. Without OPS_SMOKE_SECRET it answers 404, like a path that does not exist.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.OPS_SMOKE_SECRET;
  if (!secret?.trim()) {
    return new Response(null, { status: 404 });
  }
  const refusal = await refuseOverAddressLimit({ request, policy: OPS_SMOKE_ADDRESS_RATE_LIMIT });
  if (refusal) {
    return refusal;
  }
  if (!isBearerAuthorized({ headers: request.headers, secret })) {
    logger.warn('ops_smoke_unauthorized');
    return new Response(null, { status: 401 });
  }
  throw new OpsSmokeError();
}
