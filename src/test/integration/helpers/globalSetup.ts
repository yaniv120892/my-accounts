import { execSync } from 'node:child_process';

import { readTestDatabaseUrl } from './testDatabaseUrl';

/**
 * `migrate deploy` rather than `db push`, so the hand-written CHECK constraints
 * and partial index in the migrations exist — they are what these tests assert on.
 */
export default function globalSetup(): void {
  const testDatabaseUrl = readTestDatabaseUrl();

  execSync('npm run db:deploy', {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl, DATABASE_URL_UNPOOLED: testDatabaseUrl },
    stdio: 'inherit',
  });
}
