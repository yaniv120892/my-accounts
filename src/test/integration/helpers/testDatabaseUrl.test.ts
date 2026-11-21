import { describe, expect, it } from 'vitest';

import { readTestDatabaseUrl } from './testDatabaseUrl';

describe('readTestDatabaseUrl', () => {
  it('returns a URL whose database name ends in _test', () => {
    const url = 'postgresql://my_accounts:my_accounts@localhost:5436/my_accounts_test';

    expect(readTestDatabaseUrl({ env: { TEST_DATABASE_URL: url } })).toBe(url);
  });

  it('rejects an unset TEST_DATABASE_URL', () => {
    expect(() => readTestDatabaseUrl({ env: {} })).toThrow(/TEST_DATABASE_URL is not set/);
  });

  it.each([
    'postgresql://user:password@host.region.aws.neon.tech/my_accounts?sslmode=require',
    'postgresql://my_accounts:my_accounts@localhost:5436/my_accounts_dev',
  ])('rejects a database not named *_test: %s', (url) => {
    expect(() => readTestDatabaseUrl({ env: { TEST_DATABASE_URL: url } })).toThrow(/ends in _test/);
  });

  it('reads another variable, falling back to a default', () => {
    const url = 'postgresql://my_accounts:my_accounts@localhost:5436/my_accounts_e2e_test';

    expect(readTestDatabaseUrl({ env: {}, variable: 'E2E_DATABASE_URL', fallback: url })).toBe(url);
    expect(() =>
      readTestDatabaseUrl({
        env: { E2E_DATABASE_URL: 'postgresql://u:p@host/my_accounts' },
        variable: 'E2E_DATABASE_URL',
      }),
    ).toThrow(/E2E_DATABASE_URL names database "my_accounts"/);
  });
});
