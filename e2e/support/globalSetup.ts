import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';

import { TRUNCATE_ALL_TABLES_SQL } from '../../src/test/integration/helpers/testDatabaseUrl';

import { E2E_MAIL_OUTBOX, e2eDatabaseUrl } from './e2eEnvironment';

/** Migrates the E2E database and empties it and the mail outbox, so every run starts clean. */
export default async function globalSetup(): Promise<void> {
  const databaseUrl = e2eDatabaseUrl();
  execSync('npm run db:deploy', {
    env: { ...process.env, DATABASE_URL: databaseUrl, DATABASE_URL_UNPOOLED: databaseUrl },
    stdio: 'inherit',
  });

  const database = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    await database.$executeRawUnsafe(TRUNCATE_ALL_TABLES_SQL);
  } finally {
    await database.$disconnect();
  }

  mkdirSync(path.dirname(E2E_MAIL_OUTBOX), { recursive: true });
  rmSync(E2E_MAIL_OUTBOX, { force: true });
}
