import { headers } from 'next/headers';

import { auth } from './auth';

/** The signed-in person on a server component, or null. */
export async function currentSession() {
  return auth.api.getSession({ headers: await headers() });
}
