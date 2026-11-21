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

/**
 * Every origin a browser may post from: the public one, and on a deployment each Vercel hostname
 * that serves it too (a preview's branch and per-deployment addresses), so a link to either works.
 */
export function appOrigins(env: Env = process.env): string[] {
  const hostnames = [env.VERCEL_BRANCH_URL, env.VERCEL_URL].filter((host): host is string =>
    Boolean(host),
  );
  const origins = [appBaseUrl(env), ...hostnames.map((host) => `https://${host}`)];
  return [...new Set(origins)];
}

function deploymentUrl(env: Env): string | null {
  const host =
    env.VERCEL_ENV === 'production'
      ? env.VERCEL_PROJECT_PRODUCTION_URL
      : env.VERCEL_BRANCH_URL || env.VERCEL_URL;
  return host ? `https://${host}` : null;
}
