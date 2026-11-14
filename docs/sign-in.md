# Sign-in

Load before changing `src/lib/createAuth.ts`, the sign-in or consent page, or
`src/lib/authClient.ts`.

## Ways in

- **Emailed code.** `/sign-in` asks for an address, Better Auth's email-OTP plugin mails a 6-digit
  code (`src/services/signInCodeMail.ts`, Hebrew or English by the request's locale), and the form
  posts it to `/api/auth/sign-in/email-otp`. A first sign-in creates the account. The code is
  stored hashed, lives 10 minutes, and dies after 5 wrong guesses. The address is kept in
  `localStorage` while the code lives (`src/lib/pendingSignIn.ts`), so the code step survives a
  reload.
- **Google**, when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are both set; otherwise the button
  is hidden. A Google account with the same verified address joins the existing account.

The send runs after the response (`advanced.backgroundTasks` hands it to `waitUntil`), so the
answer and its timing are the same whether the address exists, the mail budget refused, or the
mail server failed. Without SMTP settings, `next dev` prints the mail to the console (and to
`DEV_MAIL_OUTBOX` when set); any other server logs `smtp_not_configured` at error and sends nothing.

Sessions are Better Auth's database sessions in its own cookie. They are this app's only; each
suite app keeps its own session after the OIDC exchange.

## Resuming an authorize

`/api/auth/oauth2/authorize` sends a signed-out browser to `/sign-in?<request>&sig=…`: the original
request, signed with `BETTER_AUTH_SECRET` and expiring. `oauthProviderClient()` in
`src/lib/authClient.ts` adds that query as `oauth_query` to every POST the page makes. When a POST
signs someone in, the provider's after-hook reruns authorize and the sign-in answers
`{ redirect: true, url }` instead of the user, the URL being the client's `redirect_uri` with
`code` and `state` (or `/consent`). `nextLocationAfterSignIn` reads it and the page navigates there;
a sign-in opened directly lands on `/`.

Google keeps the query too: `/sign-in/social` with `oauth_query` stores it in the Google state,
and the callback reruns authorize and redirects to the client. Both paths are covered:
`src/test/integration/oidcFlow.test.ts` and `googleSignIn.test.ts` (Google's token endpoint
stubbed), and `e2e/signIn.spec.ts` in a browser.

Better Auth's default client redirect plugin is off (`disableDefaultFetchPlugins`): it follows a
`{ redirect, url }` answer by itself, and the page's own navigation then aborted it.

## Consent

Trusted clients skip it. A client created without `skip_consent` lands on `/consent`, which posts
`accept` to `/api/auth/oauth2/consent` and follows the URL it answers with.

## Logs and limits

Each sign-in logs `signed_in` with `method` (`email_code`, `google`) and `emailHash`, never the
address. A refused code logs `sign_in_failed` with status and code; it is a person's slip, so it
does not reach Sentry. Better Auth's rate limit, counted in the `rateLimit` table, allows 10 code
requests and 30 sign-in attempts per address per 15 minutes; sign-in mail also spends a daily
budget per address (20) and for the app (`SIGN_IN_MAIL_GLOBAL_DAILY_LIMIT`), which fails closed.
