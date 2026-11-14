/** Every table the migrations create, Prisma's own ledger excepted. */
export const TRUNCATE_ALL_TABLES_SQL =
  'TRUNCATE TABLE "oauthClientAssertion", "oauthConsent", "oauthAccessToken", "oauthRefreshToken", "oauthClientResource", "oauthResource", "oauthClient", "jwks", "verification", "account", "session", "user", "rateLimit" CASCADE';

/**
 * The integration and E2E suites truncate every table, so they only run
 * against a database whose name marks it as disposable.
 */
export function readTestDatabaseUrl({
  env = process.env,
  variable = 'TEST_DATABASE_URL',
  fallback,
}: {
  env?: Readonly<Record<string, string | undefined>>;
  variable?: string;
  fallback?: string;
} = {}): string {
  const testDatabaseUrl = env[variable] || fallback;
  if (!testDatabaseUrl) {
    throw new Error(
      `${variable} is not set: run docker compose up -d and copy it from .env.example.`,
    );
  }

  const databaseName = new URL(testDatabaseUrl).pathname.slice(1);
  if (!databaseName.endsWith('_test')) {
    throw new Error(
      `${variable} names database "${databaseName}"; the suite truncates its tables, so it only runs against a database whose name ends in _test.`,
    );
  }

  return testDatabaseUrl;
}
