import { observability } from '@/lib/observability';

export const dynamic = 'force-dynamic';

/**
 * Liveness only, so a 3-minute uptime monitor never wakes a scale-to-zero
 * database.
 * The database probe is /api/health/deep.
 */
export const GET = observability.healthRoute;
