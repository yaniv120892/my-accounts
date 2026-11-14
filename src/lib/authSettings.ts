// What the Better Auth instance reads from the environment, kept apart from it so each rule is
// testable without a database.

type Env = Readonly<Record<string, string | undefined>>;

export type GoogleCredentials = { clientId: string; clientSecret: string };

export type SignInMethod = 'email_code' | 'google' | 'other';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * The suite apps that sign in without a consent screen. Only a client listed here and created
 * with `skip_consent` skips it; one created but not listed still asks the person.
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
  return !isDeployed && url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname);
}

/** For the `signed_in` log line: which way in the session came from. */
export function signInMethodOf(path: string | undefined): SignInMethod {
  if (path === '/sign-in/email-otp') {
    return 'email_code';
  }
  if (path === '/callback/:id' || path?.startsWith('/callback/google')) {
    return 'google';
  }
  return 'other';
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
