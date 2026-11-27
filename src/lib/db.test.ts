import { describe, expect, it, vi } from 'vitest';

import { logPrismaError, prismaErrorCode } from '@/lib/db';
import { logger } from '@/lib/observability';

const DRIVER_TARGET = 'quaint::connector::postgres::native';
const CLOSED_CONNECTION_MESSAGE =
  'Error in PostgreSQL connection: Error { kind: Db, cause: Some(DbError { severity: "FATAL", code: SqlState(E57P01), message: "terminating connection due to administrator command" }) }';

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

  it('reads the Postgres code from a closed connection', () => {
    expect(prismaErrorCode(CLOSED_CONNECTION_MESSAGE)).toBe('57P01');
  });

  it('reads a Postgres code the driver has no name for', () => {
    expect(prismaErrorCode('DbError { code: SqlState(Other("XX000")) }')).toBe('XX000');
  });

  it('says so when there is none', () => {
    expect(prismaErrorCode("Can't reach database server")).toBe('no code');
  });
});

describe('logPrismaError', () => {
  it('logs a connection the database closed while idle as a warning', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    logPrismaError({
      target: DRIVER_TARGET,
      message: CLOSED_CONNECTION_MESSAGE,
      timestamp: new Date(),
    });

    expect(warn).toHaveBeenCalledWith(
      { target: DRIVER_TARGET, code: '57P01' },
      'prisma_connection_closed',
    );
    expect(error).not.toHaveBeenCalled();
  });

  it('logs any other driver error as prisma_error', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    logPrismaError({
      target: DRIVER_TARGET,
      message: 'Error querying the database',
      timestamp: new Date(),
    });

    expect(error).toHaveBeenCalledWith({ target: DRIVER_TARGET, code: 'no code' }, 'prisma_error');
    expect(warn).not.toHaveBeenCalled();
  });

  it('logs the closed-connection text from another target as prisma_error', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    logPrismaError({
      target: '$queryRaw',
      message: CLOSED_CONNECTION_MESSAGE,
      timestamp: new Date(),
    });

    expect(error).toHaveBeenCalledWith({ target: '$queryRaw', code: '57P01' }, 'prisma_error');
    expect(warn).not.toHaveBeenCalled();
  });
});
