import { describe, expect, it } from 'vitest';

import { prismaErrorCode } from '@/lib/db';

describe('prismaErrorCode', () => {
  it('reads the Postgres code from a failed query', () => {
    const message =
      'QueryError(PostgresError { code: "23514", message: "violates check constraint", detail: Some("Failing row contains (32.0853, 34.7818, Azrieli).") })';

    expect(prismaErrorCode(message)).toBe('23514');
  });

  it('reads a Prisma error code', () => {
    expect(prismaErrorCode('Unique constraint failed on the fields: (`email`) P2002')).toBe(
      'P2002',
    );
  });

  it('says so when there is none', () => {
    expect(prismaErrorCode("Can't reach database server")).toBe('no code');
  });
});
