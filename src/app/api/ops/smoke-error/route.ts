import { isBearerAuthorized } from '@yaniv120892/app-kit/secrets';

import { OpsSmokeError } from '@/lib/opsSmokeError';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Fails on purpose, so an operator can prove a production 5xx reaches Sentry and the Telegram ops
 * alert. Without OPS_SMOKE_SECRET the route answers as if it did not exist.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.OPS_SMOKE_SECRET;
  if (!secret?.trim()) {
    return new Response(null, { status: 404 });
  }
  if (!isBearerAuthorized({ headers: request.headers, secret })) {
    return new Response(null, { status: 401 });
  }
  throw new OpsSmokeError();
}
