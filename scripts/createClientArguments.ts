import { parseArgs } from 'node:util';

import { isLoopbackHttpUrl } from '../src/lib/authSettings';
import type { TrustedClientRequest } from '../src/lib/oauthClients.types';

export const USAGE =
  'Usage: npm run clients:create -- --name <app> --redirect-uri <https://app/api/auth/accounts/callback> [--redirect-uri <another>] --owner <email of an existing account>';

/**
 * The command line, as a client to create; throws with the usage line when anything is missing.
 * `accountsUrl` is the my-accounts origin the client is created on: only one on this machine may
 * take a plain-HTTP redirect, wherever the script itself runs.
 */
export function parseCreateClientArguments({
  argv,
  accountsUrl,
}: {
  argv: string[];
  accountsUrl: string;
}): TrustedClientRequest {
  const { values } = parseArgs({
    args: argv,
    options: {
      name: { type: 'string' },
      'redirect-uri': { type: 'string', multiple: true },
      owner: { type: 'string' },
    },
    strict: true,
  });
  const name = values.name?.trim() ?? '';
  const redirectUris = values['redirect-uri'] ?? [];
  const ownerEmail = values.owner?.trim().toLowerCase() ?? '';
  const isComplete = name.length > 0 && redirectUris.length > 0 && ownerEmail.length > 0;
  if (!isComplete) {
    throw new Error(USAGE);
  }
  const isLocalAccounts = isLoopbackHttpUrl(new URL(accountsUrl));
  for (const uri of redirectUris) {
    assertAbsoluteUrl(uri);
    assertSecureRedirect({ uri, isLocalAccounts });
  }
  return { name, redirectUris, ownerEmail };
}

function assertAbsoluteUrl(uri: string): void {
  if (!URL.canParse(uri)) {
    throw new Error(`--redirect-uri must be an absolute URL (got "${uri}").\n${USAGE}`);
  }
}

function assertSecureRedirect({
  uri,
  isLocalAccounts,
}: {
  uri: string;
  isLocalAccounts: boolean;
}): void {
  const url = new URL(uri);
  const isAllowed = url.protocol === 'https:' || (isLocalAccounts && isLoopbackHttpUrl(url));
  if (!isAllowed) {
    throw new Error(
      `--redirect-uri must be https, or http://localhost when BETTER_AUTH_URL is local too (got "${uri}").\n${USAGE}`,
    );
  }
}
