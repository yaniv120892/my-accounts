import { createHash, randomBytes } from 'node:crypto';

import type { Auth } from '@/lib/createAuth';
import type { SignInCode } from '@/lib/createAuth.types';

export const ISSUER_ORIGIN = 'https://accounts.test';
export const ISSUER = `${ISSUER_ORIGIN}/api/auth`;
export const CLIENT_REDIRECT_URI = 'https://park.test/api/auth/accounts/callback';
const CLIENT_ADDRESS = '203.0.113.7';

/** The browser's cookies for the accounts origin, as Set-Cookie headers leave them. */
export class CookieJar {
  private readonly cookies = new Map<string, string>();

  public store(response: Response): void {
    for (const header of response.headers.getSetCookie()) {
      const [pair = ''] = header.split(';');
      const separator = pair.indexOf('=');
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      const isDeletion = value === '' || /max-age=0/i.test(header);
      if (isDeletion) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  public header(): string {
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ');
  }
}

/** Collects the codes Better Auth hands to the sender, in place of mailing them. */
export function capturingSender() {
  const sent: SignInCode[] = [];
  return {
    sent,
    async send(signInCode: SignInCode): Promise<void> {
      sent.push(signInCode);
    },
    lastCodeFor(email: string): string {
      const code = sent.findLast((signInCode) => signInCode.email === email)?.code;
      if (!code) {
        throw new Error(`No sign-in code was sent to ${email} (sent: ${sent.length}).`);
      }
      return code;
    },
  };
}

export function pkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

/** One request through `auth.handler`, from a browser that keeps cookies in `jar`. */
export async function browserRequest({
  auth,
  jar,
  path,
  method = 'GET',
  json,
  headers = {},
}: {
  auth: Auth;
  jar: CookieJar;
  path: string;
  method?: 'GET' | 'POST';
  json?: unknown;
  headers?: Record<string, string>;
}): Promise<Response> {
  const requestHeaders = new Headers({
    'x-forwarded-for': CLIENT_ADDRESS,
    cookie: jar.header(),
    ...headers,
  });
  if (method === 'POST') {
    requestHeaders.set('origin', ISSUER_ORIGIN);
    requestHeaders.set('content-type', 'application/json');
  }
  const response = await auth.handler(
    new Request(new URL(path, ISSUER_ORIGIN), {
      method,
      headers: requestHeaders,
      body: json === undefined ? undefined : JSON.stringify(json),
      redirect: 'manual',
    }),
  );
  jar.store(response);
  return response;
}

/** The suite app's server calling the token endpoint: no cookies, client_secret_basic. */
export async function tokenRequest({
  auth,
  clientId,
  clientSecret,
  form,
}: {
  auth: Auth;
  clientId: string;
  clientSecret: string;
  form: Record<string, string>;
}): Promise<Response> {
  const basic = Buffer.from(
    `${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`,
  ).toString('base64');
  return auth.handler(
    new Request(`${ISSUER}/oauth2/token`, {
      method: 'POST',
      headers: {
        authorization: `Basic ${basic}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(form).toString(),
    }),
  );
}

export function authorizePath({
  clientId,
  challenge,
  state,
  nonce,
  redirectUri = CLIENT_REDIRECT_URI,
}: {
  clientId: string;
  challenge: string;
  state: string;
  nonce: string;
  redirectUri?: string;
}): string {
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return `/api/auth/oauth2/authorize?${query}`;
}

export function locationOf(response: Response): URL {
  const location = response.headers.get('location');
  if (!location) {
    throw new Error(`Expected a redirect, got ${response.status} with no Location.`);
  }
  return new URL(location, ISSUER_ORIGIN);
}

/** An account that can own clients, as a first sign-in would leave it. */
export async function createAccount({ auth, email }: { auth: Auth; email: string }) {
  const context = await auth.$context;
  return context.internalAdapter.createUser(
    { email, name: '', emailVerified: true },
    { method: 'email-otp' },
  );
}
