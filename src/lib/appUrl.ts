const DEFAULT_APP_URL = 'http://localhost:3000';

type Env = Readonly<Record<string, string | undefined>>;

/**
 * The public origin. The OIDC issuer, every endpoint in the discovery document and the Google
 * redirect URI are built from it, so an unset BETTER_AUTH_URL on a deployment falls back to the
 * host's own address rather than to localhost, which would send every client nowhere.
 */
export function appBaseUrl(env: Env = process.env): string {
  return (env.BETTER_AUTH_URL || deploymentUrl(env) || DEFAULT_APP_URL).replace(/\/$/, '');
}

function deploymentUrl(env: Env): string | null {
  const host =
    env.VERCEL_ENV === 'production'
      ? env.VERCEL_PROJECT_PRODUCTION_URL
      : (env.VERCEL_BRANCH_URL ?? env.VERCEL_URL);
  return host ? `https://${host}` : null;
}
