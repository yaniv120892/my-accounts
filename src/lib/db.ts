import { type Prisma, PrismaClient } from '@prisma/client';

import { logger } from './observability';

type LoggingPrismaClient = ReturnType<typeof createPrismaClient>;

declare global {
  var prismaClient: LoggingPrismaClient | undefined;
}

const ERROR_CODE = /\b(P\d{4})\b|code: "(\w+)"|SqlState\((?:E(\w+)|Other\("(\w+)"\))\)/;

/**
 * The driver's background task logs this when the server closes an idle pooled
 * connection, as a database that suspends its idle compute does. No query is
 * running, and a query that then fails logs its own error event.
 */
const CLOSED_CONNECTION = {
  target: 'quaint::connector::postgres::native',
  messagePrefix: 'Error in PostgreSQL connection',
} as const;

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
  return match?.slice(1).find((group) => group !== undefined) ?? 'no code';
}

export function logPrismaError(event: Prisma.LogEvent): void {
  const fields = { target: event.target, code: prismaErrorCode(event.message) };
  if (isClosedConnection(event)) {
    logger.warn(fields, 'prisma_connection_closed');
    return;
  }
  logger.error(fields, 'prisma_error');
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
  client.$on('error', logPrismaError);
  return client;
}

function isClosedConnection({ target, message }: Prisma.LogEvent): boolean {
  return target === CLOSED_CONNECTION.target && message.startsWith(CLOSED_CONNECTION.messagePrefix);
}
