import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db';
import { logger } from '@/lib/observability';

const admin = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

afterAll(async () => {
  await admin.$disconnect();
});

/** What a database that suspends an idle compute does to the app's open connections. */
async function closeTheAppConnections(): Promise<void> {
  await admin.$executeRaw`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = current_database() AND usename = current_user AND pid <> pg_backend_pid()`;
}

describe('a failed query', () => {
  it('is logged as prisma_error with its Postgres code', async () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    await expect(prisma.$queryRaw`SELECT 1 / 0`).rejects.toThrow();

    expect(error).toHaveBeenCalledWith({ target: '$queryRaw', code: '22012' }, 'prisma_error');
  });
});

describe('a database connection closed while idle', () => {
  it('is logged as a warning with its Postgres code, not as prisma_error', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    await prisma.$queryRaw`SELECT 1`;

    await closeTheAppConnections();

    await vi.waitFor(() => {
      expect(error.mock.calls).toEqual([]);
      expect(warn).toHaveBeenCalledWith(
        { target: 'quaint::connector::postgres::native', code: '57P01' },
        'prisma_connection_closed',
      );
    });
    await prisma.$disconnect();

    expect(error.mock.calls).toEqual([]);
  });
});
