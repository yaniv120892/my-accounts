import { createLocalJWKSet, jwtVerify } from 'jose';
import { beforeEach, describe, expect, it } from 'vitest';

import { createAuth, type Auth } from '@/lib/createAuth';
import { admitSignInCodeMail } from '@/services/signInCodeMail';
import { createTrustedClient } from '@/lib/oauthClients';
import type { CreatedClient } from '@/lib/oauthClients.types';

import {
  CLIENT_REDIRECT_URI,
  CookieJar,
  ISSUER,
  authorizePath,
  browserRequest,
  capturingSender,
  createAccount,
  locationOf,
  pkcePair,
  tokenRequest,
} from './helpers/oidc';

const OWNER_EMAIL = 'owner@example.com';
const PERSON_EMAIL = 'dana@example.com';

let sender: ReturnType<typeof capturingSender>;
let trustedClients: Set<string>;
let auth: Auth;
let client: CreatedClient;

beforeEach(async () => {
  sender = capturingSender();
  trustedClients = new Set();
  auth = createAuth({
    admitSignInCode: admitSignInCodeMail,
    sendSignInCode: sender.send,
    trustedClients,
  });
  await createAccount({ auth, email: OWNER_EMAIL });
  client = await createTrustedClient({
    auth,
    request: { name: 'Park', redirectUris: [CLIENT_REDIRECT_URI], ownerEmail: OWNER_EMAIL },
  });
  trustedClients.add(client.clientId);
});

describe('signing in to a suite app through my-accounts', () => {
  it('runs authorize, the code sign-in and the token exchange to a verified id_token', async () => {
    const jar = new CookieJar();
    const { verifier, challenge } = pkcePair();

    const { code, state } = await signInThroughAuthorize({ jar, challenge, nonce: 'nonce-1' });
    expect(state).toBe('state-1');

    const tokenResponse = await tokenRequest({
      auth,
      ...client,
      form: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: CLIENT_REDIRECT_URI,
        code_verifier: verifier,
      },
    });
    expect(tokenResponse.status).toBe(200);
    const tokens: { id_token: string } = await tokenResponse.json();

    const jwks = await (await browserRequest({ auth, jar, path: '/api/auth/jwks' })).json();
    const { payload, protectedHeader } = await jwtVerify(tokens.id_token, createLocalJWKSet(jwks), {
      issuer: ISSUER,
      audience: client.clientId,
    });
    expect(protectedHeader.alg).toBe('EdDSA');
    expect(payload).toMatchObject({
      nonce: 'nonce-1',
      email: PERSON_EMAIL,
      email_verified: true,
    });
  });

  it('refuses the code with the wrong code_verifier', async () => {
    const jar = new CookieJar();
    const { challenge } = pkcePair();
    const { code } = await signInThroughAuthorize({ jar, challenge, nonce: 'nonce-2' });

    const tokenResponse = await tokenRequest({
      auth,
      ...client,
      form: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: CLIENT_REDIRECT_URI,
        code_verifier: pkcePair().verifier,
      },
    });

    expect(tokenResponse.status).toBe(400);
    expect(await tokenResponse.json()).toMatchObject({ error: 'invalid_grant' });
  });

  it('refuses a redirect_uri the client did not register, without redirecting there', async () => {
    const jar = new CookieJar();
    const response = await browserRequest({
      auth,
      jar,
      path: authorizePath({
        clientId: client.clientId,
        challenge: pkcePair().challenge,
        state: 'state-x',
        nonce: 'nonce-x',
        redirectUri: 'https://attacker.test/callback',
      }),
    });

    const location = locationOf(response);
    expect(`${location.origin}${location.pathname}`).toBe(`${ISSUER}/error`);
    expect(location.searchParams.get('error')).toBe('invalid_redirect');
  });

  it('sends a client created without skip_consent to the consent page', async () => {
    const untrusted = await createUntrustedClient();
    const jar = new CookieJar();
    await signInDirectly({ jar });

    const response = await browserRequest({
      auth,
      jar,
      path: authorizePath({
        clientId: untrusted,
        challenge: pkcePair().challenge,
        state: 'state-3',
        nonce: 'nonce-3',
      }),
      headers: { 'sec-fetch-mode': 'navigate' },
    });

    const location = locationOf(response);
    expect(location.pathname).toBe('/consent');
    expect(location.searchParams.get('client_id')).toBe(untrusted);
    expect(location.searchParams.get('sig')).toBeTruthy();
  });
});

/**
 * The browser opens authorize signed out, lands on /sign-in with a signed oauth_query, asks for a
 * code, and posts it with the oauth_query the client plugin adds; the answer names the redirect.
 */
async function signInThroughAuthorize({
  jar,
  challenge,
  nonce,
}: {
  jar: CookieJar;
  challenge: string;
  nonce: string;
}): Promise<{ code: string; state: string | null }> {
  const authorize = await browserRequest({
    auth,
    jar,
    path: authorizePath({ clientId: client.clientId, challenge, state: 'state-1', nonce }),
    headers: { 'sec-fetch-mode': 'navigate' },
  });
  const signInPage = locationOf(authorize);
  expect(signInPage.pathname).toBe('/sign-in');
  const oauthQuery = signInPage.search.slice(1);

  const sent = await browserRequest({
    auth,
    jar,
    path: '/api/auth/email-otp/send-verification-otp',
    method: 'POST',
    json: { email: PERSON_EMAIL, type: 'sign-in', oauth_query: oauthQuery },
  });
  expect(sent.status).toBe(200);

  const signedIn = await browserRequest({
    auth,
    jar,
    path: '/api/auth/sign-in/email-otp',
    method: 'POST',
    json: { email: PERSON_EMAIL, otp: sender.lastCodeFor(PERSON_EMAIL), oauth_query: oauthQuery },
  });
  expect(signedIn.status).toBe(200);
  const body: { redirect?: boolean; url?: string } = await signedIn.json();
  expect(body.redirect).toBe(true);

  const callback = new URL(body.url ?? '');
  expect(`${callback.origin}${callback.pathname}`).toBe(CLIENT_REDIRECT_URI);
  const code = callback.searchParams.get('code');
  if (!code) {
    throw new Error(`The redirect carried no code: ${callback}`);
  }
  return { code, state: callback.searchParams.get('state') };
}

async function signInDirectly({ jar }: { jar: CookieJar }): Promise<void> {
  await browserRequest({
    auth,
    jar,
    path: '/api/auth/email-otp/send-verification-otp',
    method: 'POST',
    json: { email: PERSON_EMAIL, type: 'sign-in' },
  });
  const signedIn = await browserRequest({
    auth,
    jar,
    path: '/api/auth/sign-in/email-otp',
    method: 'POST',
    json: { email: PERSON_EMAIL, otp: sender.lastCodeFor(PERSON_EMAIL) },
  });
  expect(signedIn.status).toBe(200);
}

async function createUntrustedClient(): Promise<string> {
  const created = await createTrustedClient({
    auth,
    request: { name: 'Stranger', redirectUris: [CLIENT_REDIRECT_URI], ownerEmail: OWNER_EMAIL },
  });
  const context = await auth.$context;
  await context.adapter.update({
    model: 'oauthClient',
    where: [{ field: 'clientId', value: created.clientId }],
    update: { skipConsent: false },
  });
  return created.clientId;
}
