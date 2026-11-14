/**
 * Creates a trusted suite client and prints its id and secret once, to stdout. Everything else
 * goes to stderr, so `> client.txt` captures only the credentials. Runs against DATABASE_URL with
 * the deployment's BETTER_AUTH_SECRET and BETTER_AUTH_URL; see docs/clients.md.
 */
import { existsSync } from 'node:fs';

import { parseCreateClientArguments } from './createClientArguments';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}
process.env.LOG_LEVEL ??= 'warn';

async function main(): Promise<void> {
  const { appBaseUrl } = await import('../src/lib/appUrl');
  const request = parseCreateClientArguments({
    argv: process.argv.slice(2),
    accountsUrl: appBaseUrl(),
  });
  const { createAuth } = await import('../src/lib/createAuth');
  const { createTrustedClient } = await import('../src/lib/oauthClients');
  const { prisma } = await import('../src/lib/db');

  try {
    // Creating a client sends no mail; a code asked for through this instance would be a bug.
    const auth = createAuth({ admitSignInCode: refuseToSend, sendSignInCode: refuseToSend });
    const { clientId, clientSecret } = await createTrustedClient({ auth, request });
    process.stdout.write(
      `ACCOUNTS_CLIENT_ID=${clientId}\nACCOUNTS_CLIENT_SECRET=${clientSecret}\n`,
    );
    process.stderr.write(
      `Created "${request.name}". The secret is shown once: store it in the client app now, and add ${clientId} to TRUSTED_CLIENT_IDS here.\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function refuseToSend(): Promise<never> {
  throw new Error('create-client sends no sign-in codes.');
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
