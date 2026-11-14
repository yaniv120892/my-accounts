import { UnsecuredJWT } from 'jose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createAuth, type Auth } from '@/lib/createAuth';
import { createTrustedClient } from '@/lib/oauthClients';
import type { CreatedClient } from '@/lib/oauthClients.types';

import { fakeGoogle } from './helpers/network';
import {
  CLIENT_REDIRECT_URI,
  CookieJar,
  authorizePath,
  browserRequest,
  capturingSender,
  createAccount,
  locationOf,
  pkcePair,
} from './helpers/oidc';

const GOOGLE_EMAIL = 'noa@gmail.test';
const startedSchema = z.object({ url: z.string() });

let auth: Auth;
let client: CreatedClient;

beforeEach(async () => {
  vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client-id');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-client-secret');
  auth = createAuth({ sendSignInCode: capturingSender().send, trustedClients: new Set() });
  await createAccount({ auth, email: 'owner@example.com' });
  client = await createTrustedClient({
    auth,
    request: { name: 'Park', redirectUris: [CLIENT_REDIRECT_URI], ownerEmail: 'owner@example.com' },
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('signing in with Google in the middle of an authorize', () => {
  it('keeps the signed oauth_query across the Google round trip and lands on the client', async () => {
    const jar = new CookieJar();
    const authorize = await browserRequest({
      auth,
      jar,
      path: authorizePath({
        clientId: client.clientId,
        challenge: pkcePair().challenge,
        state: 'client-state',
        nonce: 'nonce-g',
      }),
      headers: { 'sec-fetch-mode': 'navigate' },
    });
    const oauthQuery = locationOf(authorize).search.slice(1);

    const started = await browserRequest({
      auth,
      jar,
      path: '/api/auth/sign-in/social',
      method: 'POST',
      json: { provider: 'google', callbackURL: '/', oauth_query: oauthQuery },
    });
    const { url } = startedSchema.parse(await started.json());
    const googleState = new URL(url).searchParams.get('state') ?? '';
    expect(new URL(url).hostname).toBe('accounts.google.com');

    answerGoogleWith({ sub: 'google-sub-1', email: GOOGLE_EMAIL });
    const callback = await browserRequest({
      auth,
      jar,
      path: `/api/auth/callback/google?code=google-code&state=${encodeURIComponent(googleState)}`,
      headers: { 'sec-fetch-mode': 'navigate' },
    });

    const landing = locationOf(callback);
    expect(`${landing.origin}${landing.pathname}`).toBe(CLIENT_REDIRECT_URI);
    expect(landing.searchParams.get('code')).toBeTruthy();
    expect(landing.searchParams.get('state')).toBe('client-state');
  });

  it('joins a Google sign-in to the account its verified address already has', async () => {
    const existing = await createAccount({ auth, email: GOOGLE_EMAIL });
    const jar = new CookieJar();
    const started = await browserRequest({
      auth,
      jar,
      path: '/api/auth/sign-in/social',
      method: 'POST',
      json: { provider: 'google', callbackURL: '/' },
    });
    const googleState = new URL(startedSchema.parse(await started.json()).url).searchParams.get(
      'state',
    );
    answerGoogleWith({ sub: 'google-sub-2', email: GOOGLE_EMAIL });

    await browserRequest({
      auth,
      jar,
      path: `/api/auth/callback/google?code=google-code&state=${encodeURIComponent(googleState ?? '')}`,
      headers: { 'sec-fetch-mode': 'navigate' },
    });

    const session = await auth.api.getSession({ headers: new Headers({ cookie: jar.header() }) });
    expect(session?.user.id).toBe(existing.id);
  });
});

function answerGoogleWith({ sub, email }: { sub: string; email: string }): void {
  fakeGoogle.answerTokenRequestWith({
    access_token: 'google-access-token',
    token_type: 'Bearer',
    expires_in: 3600,
    id_token: new UnsecuredJWT({ sub, email, email_verified: true, name: 'Noa' }).encode(),
  });
}
