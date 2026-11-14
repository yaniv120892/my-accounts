import path from 'node:path';

import { readTestDatabaseUrl } from '../../src/test/integration/helpers/testDatabaseUrl';

const DOCKER_COMPOSE_E2E_DATABASE =
  'postgresql://my_accounts:my_accounts@localhost:5436/my_accounts_e2e_test';

/** Its own port, clear of `next dev`'s 3000 and of sibling apps' E2E servers. */
export const E2E_PORT = Number(process.env.E2E_PORT) || 3218;
export const E2E_ORIGIN = `http://localhost:${E2E_PORT}`;

/** Shared by the server and the specs, so a helper can run the client script it trusts. */
export const E2E_AUTH_SECRET = 'e2e-secret-e2e-secret-e2e-secret-e2e-secret';

/** Where the dev server writes each mail it would have sent; specs read sign-in codes from it. */
export const E2E_MAIL_OUTBOX = path.join(process.cwd(), 'test-results', 'e2e-mail-outbox.jsonl');

/** E2E_DATABASE_URL, or the docker-compose E2E database; refused unless its name ends in _test. */
export function e2eDatabaseUrl(): string {
  return readTestDatabaseUrl({
    variable: 'E2E_DATABASE_URL',
    fallback: DOCKER_COMPOSE_E2E_DATABASE,
  });
}
