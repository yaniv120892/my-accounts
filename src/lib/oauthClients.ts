import { makeSignature } from 'better-auth/crypto';

import type { Auth } from './createAuth';
import type { CreatedClient, TrustedClientRequest } from './oauthClients.types';

/** A client registered without scopes may request none, so every authorize would fail. */
const CLIENT_SCOPES = 'openid profile email offline_access';

/**
 * Creates a confidential suite client that skips the consent screen. Server-side only: the admin
 * API is not reachable over HTTP, and every client route that is has been disabled.
 *
 * The admin API still wants a signed-in caller (its privilege check runs on a session), so the
 * owner gets a session that lives only for this call.
 */
export async function createTrustedClient({
  auth,
  request,
}: {
  auth: Auth;
  request: TrustedClientRequest;
}): Promise<CreatedClient> {
  const context = await auth.$context;
  const owner = await context.internalAdapter.findUserByEmail(request.ownerEmail);
  if (!owner) {
    throw new Error(
      `No account for ${request.ownerEmail}: sign in to my-accounts once with that address, then run this again.`,
    );
  }

  const session = await context.internalAdapter.createSession(owner.user.id);
  try {
    const signature = await makeSignature(session.token, context.secret);
    const cookie = `${context.authCookies.sessionToken.name}=${encodeURIComponent(`${session.token}.${signature}`)}`;
    const created = await auth.api.adminCreateOAuthClient({
      headers: new Headers({ cookie }),
      body: {
        client_name: request.name,
        scope: CLIENT_SCOPES,
        redirect_uris: request.redirectUris,
        token_endpoint_auth_method: 'client_secret_basic',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        require_pkce: true,
        skip_consent: true,
      },
    });
    return requireSecret(created);
  } finally {
    await context.internalAdapter.deleteSession(session.token);
  }
}

function requireSecret(created: { client_id: string; client_secret?: string }): CreatedClient {
  if (!created.client_secret) {
    throw new Error(
      `Client ${created.client_id} was created without a secret; delete it and retry.`,
    );
  }
  return { clientId: created.client_id, clientSecret: created.client_secret };
}
