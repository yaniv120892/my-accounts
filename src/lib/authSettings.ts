// What the Better Auth instance reads from the environment, kept apart from it so each rule is
// testable without a database.

import { CODE_SIGN_IN_PATH, SOCIAL_CALLBACK_PATH, SOCIAL_SIGN_IN_PATH } from './authPaths';

type Env = Readonly<Record<string, string | undefined>>;

export type GoogleCredentials = { clientId: string; clientSecret: string };

export type SignInMethod = 'email_code' | 'google' | 'other';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * The suite apps Better Auth caches and refuses to let anyone change. Whether a client skips the
 * consent screen is its `skip_consent` column alone; listing it here does not decide that.
 */
export function trustedClientIds(env: Env = process.env): Set<string> {
  const ids = (env.TRUSTED_CLIENT_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  return new Set(ids);
}

/** Both or nothing: half a pair would show a Google button that can only fail. */
export function googleCredentials(env: Env = process.env): GoogleCredentials | null {
  const clientId = env.GOOGLE_CLIENT_ID?.trim() ?? '';
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim() ?? '';
  if (!clientId || !clientSecret) {
    return null;
  }
  return { clientId, clientSecret };
}

/**
 * A suite app running on this machine (`http://localhost:3001/...`) may be a client while
 * developing. Never on a deployment, where a plain-HTTP redirect would hand the code to anyone on
 * the network path.
 */
export function allowsLocalDevelopmentRedirect({
  url,
  env = process.env,
}: {
  url: URL;
  env?: Env;
}): boolean {
  const isDeployed = Boolean(env.VERCEL_ENV) || env.NODE_ENV === 'production';
  return !isDeployed && isLoopbackHttpUrl(url);
}

/** `http://localhost…` and its kin: plain HTTP that never leaves this machine. */
export function isLoopbackHttpUrl(url: URL): boolean {
  return url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname);
}

/** For the sign-in log lines: which way in the session came from. Google is the one social provider. */
export function signInMethodOf(path: string | undefined): SignInMethod {
  switch (path) {
    case CODE_SIGN_IN_PATH:
      return 'email_code';
    case SOCIAL_SIGN_IN_PATH:
    case SOCIAL_CALLBACK_PATH:
      return 'google';
    default:
      return 'other';
  }
}

type ClaimsUser = { email: string; emailVerified: boolean; name: string; image?: string | null };

/**
 * The id_token carries who signed in, so a suite app can create its session from the token alone
 * without a userinfo round trip. Only what the granted scopes cover goes in.
 */
export function identityClaims({
  user,
  scopes,
}: {
  user: ClaimsUser;
  scopes: readonly string[];
}): Record<string, string | boolean> {
  const claims: Record<string, string | boolean> = {};
  if (scopes.includes('email')) {
    claims.email = user.email;
    claims.email_verified = user.emailVerified;
  }
  if (scopes.includes('profile') && user.name) {
    claims.name = user.name;
  }
  if (scopes.includes('profile') && user.image) {
    claims.picture = user.image;
  }
  return claims;
}
