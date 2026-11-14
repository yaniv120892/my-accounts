// @vitest-environment node
import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { errorFields } from '@/lib/logFields';

describe('errorFields', () => {
  it('keeps the message of an ordinary error', () => {
    expect(errorFields(new Error('SMTP connection refused'))).toEqual({
      errorName: 'Error',
      errorMessage: 'SMTP connection refused',
    });
  });

  it('withholds a Prisma message, which quotes the email it was querying', () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed: where: { email: "dana@example.com" }',
      { code: 'P2002', clientVersion: '6.19.3' },
    );

    const { errorMessage } = errorFields(error);

    expect(errorMessage).not.toContain('dana@example.com');
    expect(errorMessage).toContain('P2002');
  });
});
