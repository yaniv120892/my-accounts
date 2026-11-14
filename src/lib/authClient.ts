'use client';

import { oauthProviderClient } from '@better-auth/oauth-provider/client';
import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/**
 * Same-origin, so no base URL. `oauthProviderClient` adds the page's signed `oauth_query` to
 * every POST, which is how a sign-in or consent resumes the authorize that sent the person here.
 *
 * The default redirect plugin is off: it follows every `{ redirect, url }` answer by itself, and
 * the form's own navigation to the same URL then aborted it. Each form navigates explicitly.
 */
export const authClient = createAuthClient({
  disableDefaultFetchPlugins: true,
  plugins: [emailOTPClient(), oauthProviderClient()],
});
