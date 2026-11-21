import { Prisma } from '@prisma/client';
import { expect } from 'vitest';

export const QUOTED_EMAIL = 'dana@example.com';
export const QUOTED_NAME = 'Dana Levi';
const FAILING_ROW = 'Failing row contains';

/**
 * Shaped like the errors Prisma 6 throws: the message quotes the query's arguments, and a failed
 * constraint quotes the whole row.
 */
export function prismaErrorQuotingData(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    [
      'Invalid `prisma.user.create()` invocation:',
      `where: { email: "${QUOTED_EMAIL}" }`,
      'null value in column "emailVerified" of relation "user" violates not-null constraint',
      `DETAIL: ${FAILING_ROW} (d1826fe8, ${QUOTED_NAME}, ${QUOTED_EMAIL}, null).`,
    ].join('\n'),
    { code: 'P2010', clientVersion: '6.19.3' },
  );
}

export function expectNoQuotedData(text: string): void {
  for (const quoted of [QUOTED_EMAIL, QUOTED_NAME, FAILING_ROW]) {
    expect(text).not.toContain(quoted);
  }
}
