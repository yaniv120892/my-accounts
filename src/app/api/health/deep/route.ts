import { prisma } from '@/lib/db';
import { observability } from '@/lib/observability';
import { DEEP_HEALTH_ADDRESS_RATE_LIMIT, refuseOverAddressLimit } from '@/lib/rateLimits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Every probe wakes a scale-to-zero database, so nothing may poll this
 * faster than hourly, and an address that tries is refused before the probe.
 */
const deepHealthRoute = observability.createDeepHealthRoute({
  probes: { db: () => prisma.$queryRaw`SELECT 1` },
});

export async function GET(request: Request): Promise<Response> {
  const refusal = await refuseOverAddressLimit({ request, policy: DEEP_HEALTH_ADDRESS_RATE_LIMIT });
  if (refusal) {
    return refusal;
  }
  return deepHealthRoute();
}
