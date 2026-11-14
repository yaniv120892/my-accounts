import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuth, type Auth } from '@/lib/createAuth';
import { admitSignInCodeMail } from '@/services/signInCodeMail';
import { prisma } from '@/lib/db';
import { createTrustedClient } from '@/lib/oauthClients';
import { logger } from '@/lib/observability';
import { SIGN_IN_CODE_ALLOWED_ATTEMPTS } from '@/lib/signInCode';

import {
  CLIENT_REDIRECT_URI,
  CookieJar,
  ISSUER,
  browserRequest,
  capturingSender,
  createAccount,
} from './helpers/oidc';

const EMAIL = 'dana@example.com';

/** Written out, not imported: dropping one from the app's list must fail this suite. */
const ROUTES_NO_BROWSER_MAY_REACH = [
  '/token',
  '/oauth2/register',
  '/oauth2/create-client',
  '/oauth2/get-client',
  '/oauth2/get-clients',
  '/oauth2/update-client',
  '/oauth2/delete-client',
  '/oauth2/client/rotate-secret',
  '/oauth2/client/rotate-keys',
];

let sender: ReturnType<typeof capturingSender>;
let auth: Auth;

beforeEach(() => {
  sender = capturingSender();
  auth = createAuth({
    admitSignInCode: admitSignInCodeMail,
    sendSignInCode: sender.send,
    trustedClients: new Set(),
  });
});

describe('the discovery document', () => {
  it('names this origin as the issuer and requires PKCE with S256', async () => {
    const response = await browserRequest({
      auth,
      jar: new CookieJar(),
      path: '/api/auth/.well-known/openid-configuration',
    });

    expect(await response.json()).toMatchObject({
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/oauth2/authorize`,
      token_endpoint: `${ISSUER}/oauth2/token`,
      userinfo_endpoint: `${ISSUER}/oauth2/userinfo`,
      jwks_uri: `${ISSUER}/jwks`,
      code_challenge_methods_supported: ['S256'],
    });
  });
});

describe('client routes', () => {
  it('answers 404 on every client route a signed-in person could reach', async () => {
    const jar = new CookieJar();
    await signIn({ jar });

    for (const path of ROUTES_NO_BROWSER_MAY_REACH) {
      const response = await browserRequest({
        auth,
        jar,
        path: `/api/auth${path}`,
        method: 'POST',
        json: { client_name: 'Mine', redirect_uris: ['https://evil.test/cb'] },
      });
      expect(response.status, path).toBe(404);
    }
  });

  it('refuses to create a client for an address with no account', async () => {
    await expect(
      createTrustedClient({
        auth,
        request: {
          name: 'Park',
          redirectUris: [CLIENT_REDIRECT_URI],
          ownerEmail: 'nobody@example.com',
        },
      }),
    ).rejects.toThrow('No account for nobody@example.com');
  });

  it('leaves no session behind for the owner', async () => {
    const owner = await createAccount({ auth, email: 'owner@example.com' });
    await createTrustedClient({
      auth,
      request: { name: 'Park', redirectUris: [CLIENT_REDIRECT_URI], ownerEmail: owner.email },
    });

    const context = await auth.$context;
    expect(await context.internalAdapter.listSessions(owner.id)).toEqual([]);
  });
});

describe('the sign-in code', () => {
  it(`voids a code after ${SIGN_IN_CODE_ALLOWED_ATTEMPTS} wrong guesses`, async () => {
    const jar = new CookieJar();
    await requestCode({ jar });
    const code = sender.lastCodeFor(EMAIL);
    const wrongCode = code === '000000' ? '111111' : '000000';

    for (let attempt = 0; attempt < SIGN_IN_CODE_ALLOWED_ATTEMPTS; attempt++) {
      const wrong = await submitCode({ jar, otp: wrongCode });
      expect(wrong.status).toBe(400);
    }
    const right = await submitCode({ jar, otp: code });

    expect(right.status).toBe(403);
    expect(await right.json()).toMatchObject({ code: 'TOO_MANY_ATTEMPTS' });
  });

  it('stores the code hashed, so a database read does not hand out live codes', async () => {
    await requestCode({ jar: new CookieJar() });

    const rows = await prisma.verification.findMany({ select: { value: true } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.value).not.toContain(sender.lastCodeFor(EMAIL));
  });

  it('rate-limits asking for codes from one address', async () => {
    const statuses: number[] = [];
    for (let request = 0; request < 11; request++) {
      statuses.push((await requestCode({ jar: new CookieJar() })).status);
    }

    expect(statuses.slice(0, 10).every((status) => status === 200)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it('keeps the code already sent when the mail budget refuses another', async () => {
    const isAdmitted = [true, false];
    auth = createAuth({
      admitSignInCode: async () => isAdmitted.shift() ?? false,
      sendSignInCode: sender.send,
      trustedClients: new Set(),
    });
    const jar = new CookieJar();
    await requestCode({ jar });
    const firstCode = sender.lastCodeFor(EMAIL);

    const refused = await requestCode({ jar });
    const signedIn = await submitCode({ jar, otp: firstCode });

    expect(refused.status).toBe(200);
    expect(await refused.json()).toEqual({ success: true });
    expect(signedIn.status).toBe(200);
  });

  it('rate-limits code attempts from one address', async () => {
    const jar = new CookieJar();
    await requestCode({ jar });
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 31; attempt++) {
      statuses.push((await submitCode({ jar, otp: '000000' })).status);
    }

    expect(statuses.slice(0, 30)).not.toContain(429);
    expect(statuses[30]).toBe(429);
  });

  it('logs signed_in with the method and a hashed address, never the address', async () => {
    const info = vi.spyOn(logger, 'info');
    await signIn({ jar: new CookieJar() });

    const signedIn = info.mock.calls.find(([, message]) => message === 'signed_in');
    expect(signedIn?.[0]).toMatchObject({ method: 'email_code', emailHash: expect.any(String) });
    expect(JSON.stringify(info.mock.calls)).not.toContain(EMAIL);
  });

  it('logs a wrong code as sign_in_failed', async () => {
    const info = vi.spyOn(logger, 'info');
    const jar = new CookieJar();
    await requestCode({ jar });
    await submitCode({ jar, otp: sender.lastCodeFor(EMAIL) === '000000' ? '111111' : '000000' });

    const failed = info.mock.calls.find(([, message]) => message === 'sign_in_failed');
    expect(failed?.[0]).toMatchObject({ method: 'email_code', status: 400 });
  });
});

async function requestCode({ jar }: { jar: CookieJar }): Promise<Response> {
  return browserRequest({
    auth,
    jar,
    path: '/api/auth/email-otp/send-verification-otp',
    method: 'POST',
    json: { email: EMAIL, type: 'sign-in' },
  });
}

async function submitCode({ jar, otp }: { jar: CookieJar; otp: string }): Promise<Response> {
  return browserRequest({
    auth,
    jar,
    path: '/api/auth/sign-in/email-otp',
    method: 'POST',
    json: { email: EMAIL, otp },
  });
}

async function signIn({ jar }: { jar: CookieJar }): Promise<void> {
  await requestCode({ jar });
  const response = await submitCode({ jar, otp: sender.lastCodeFor(EMAIL) });
  expect(response.status).toBe(200);
}
