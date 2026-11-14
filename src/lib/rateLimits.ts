import { addressClient } from '@yaniv120892/app-kit/client-address';
import { refuseIfRateLimited, type RateLimitPolicy } from '@yaniv120892/app-kit/rate-limit';

import { rateLimiter } from './guards';

const HOUR_SECONDS = 60 * 60;

/** Every probe wakes a scale-to-zero database; an uptime monitor polls far below this. */
export const DEEP_HEALTH_ADDRESS_RATE_LIMIT: RateLimitPolicy = {
  name: 'deep_health_ip',
  limit: 10,
  windowSeconds: HOUR_SECONDS,
  whenStoreUnavailable: 'allow',
};

export const RATE_LIMITED_MESSAGE = 'Too many requests. Wait a moment and try again.';

/** For a route answered in JSON: null when the request may go on, else the 429 or 503 to send. */
export async function refuseOverAddressLimit({
  request,
  policy,
}: {
  request: Request;
  policy: RateLimitPolicy;
}): Promise<Response | null> {
  return refuseIfRateLimited({
    rateLimiter,
    checks: [{ policy, clientId: addressClient(request.headers) }],
    overLimitMessage: RATE_LIMITED_MESSAGE,
  });
}
