import { parseArgs } from 'node:util';

import type { TrustedClientRequest } from '../src/lib/oauthClients.types';

export const USAGE =
  'Usage: npm run clients:create -- --name <app> --redirect-uri <https://app/api/auth/accounts/callback> [--redirect-uri <another>] --owner <email of an existing account>';

/** The command line, as a client to create; throws with the usage line when anything is missing. */
export function parseCreateClientArguments(argv: string[]): TrustedClientRequest {
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
  for (const uri of redirectUris) {
    assertAbsoluteUrl(uri);
  }
  return { name, redirectUris, ownerEmail };
}

function assertAbsoluteUrl(uri: string): void {
  if (!URL.canParse(uri)) {
    throw new Error(`--redirect-uri must be an absolute URL (got "${uri}").\n${USAGE}`);
  }
}
