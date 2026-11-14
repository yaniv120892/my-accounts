import { PrismaClient } from '@prisma/client';

import { logger } from './observability';

type LoggingPrismaClient = ReturnType<typeof createPrismaClient>;

declare global {
  var prismaClient: LoggingPrismaClient | undefined;
}

const ERROR_CODE = /\b(P\d{4})\b|code: "(\w+)"/;

export const prisma = globalThis.prismaClient ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaClient = prisma;
}

/**
 * The Prisma or Postgres code in an error event's message. The rest of the
 * message is withheld: it quotes the query's arguments and the failing row.
 */
export function prismaErrorCode(message: string): string {
  const match = ERROR_CODE.exec(message);
  return match?.[1] ?? match?.[2] ?? 'no code';
}

function createPrismaClient() {
  const client = new PrismaClient({
    log: [
      { emit: 'event', level: 'warn' },
      { emit: 'event', level: 'error' },
    ],
  });
  client.$on('warn', (event) => {
    logger.warn({ target: event.target, code: prismaErrorCode(event.message) }, 'prisma_warning');
  });
  client.$on('error', (event) => {
    logger.error({ target: event.target, code: prismaErrorCode(event.message) }, 'prisma_error');
  });
  return client;
}
