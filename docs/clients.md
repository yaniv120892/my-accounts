# Suite apps as OIDC clients

Load before creating a client, changing `scripts/create-client.mts`, or wiring an app to sign in
through my-accounts.

## Registering an app

1. Sign in to my-accounts once with the operator's address; the script records that account as
   the client's owner.
2. Run the script with the deployment's database and secrets in the environment (or `.env`):

   ```bash
   DATABASE_URL=… BETTER_AUTH_SECRET=… BETTER_AUTH_URL=https://<accounts origin> \
     npm run --silent clients:create -- \
       --name "Parking" \
       --redirect-uri https://<app origin>/api/auth/accounts/callback \
       --owner you@example.com
   ```

   It prints `ACCOUNTS_CLIENT_ID=…` and `ACCOUNTS_CLIENT_SECRET=…` to stdout, once. The secret is
   stored hashed and cannot be shown again; a lost secret means a new client. Repeat
   `--redirect-uri` for each exact callback (a preview origin, `http://localhost:<port>/…` for
   local work). The script takes a plain-HTTP loopback redirect only when `BETTER_AUTH_URL` is
   itself on this machine, and the server accepts one only off Vercel, outside production.

3. Add the client id to `TRUSTED_CLIENT_IDS` on the my-accounts Vercel project (comma-separated)
   and redeploy. The list is a cache that also freezes the client against edits; consent is
   decided by the `skip_consent` column the script sets, listed or not.

The client is confidential (`client_secret_basic`), may use `authorization_code` and
`refresh_token`, requires PKCE, may ask for `openid profile email offline_access`, and skips the
consent screen. No HTTP route can create, read, change or delete a client: they are all in
`DISABLED_AUTH_PATHS`, and the admin API that the script calls is server-only.

## Revoking a client

Delete or disable its `oauthClient` row. A client in `TRUSTED_CLIENT_IDS` is cached by each warm
instance and never re-read, so also remove its id from the list and redeploy: until then a warm
instance still accepts it.

## What the client app configures

| Variable                 | Value                                |
| ------------------------ | ------------------------------------ |
| `ACCOUNTS_ISSUER`        | `https://<accounts origin>/api/auth` |
| `ACCOUNTS_CLIENT_ID`     | from the script                      |
| `ACCOUNTS_CLIENT_SECRET` | from the script                      |

Its callback route is `<app origin>/api/auth/accounts/callback`, exactly as registered.

- Discovery: `${ACCOUNTS_ISSUER}/.well-known/openid-configuration`.
- Authorize: `${ACCOUNTS_ISSUER}/oauth2/authorize` with `response_type=code`, `scope=openid email
profile`, `state`, `nonce`, `code_challenge` and `code_challenge_method=S256`.
- Token: POST `${ACCOUNTS_ISSUER}/oauth2/token`, form-encoded, `Authorization: Basic` with the id
  and secret, plus `code`, `redirect_uri` and `code_verifier`.
- Verify the `id_token` against `${ACCOUNTS_ISSUER}/jwks` (EdDSA): `iss` is the issuer, `aud` the
  client id, `nonce` the one sent. It carries `sub`, `email`, `email_verified` and, with `profile`,
  `name`. Key the app's user on `sub`.

A redirect URI that is not registered is refused at authorize with an error page, never
redirected to.
