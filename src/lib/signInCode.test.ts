import { describe, expect, it } from 'vitest';

import { toSignInCode } from '@/lib/signInCode';

describe('toSignInCode', () => {
  it.each([
    ['482913', '482913'],
    ['482 913', '482913'],
    ['Your sign-in code: 482913, valid 10 minutes', '482913'],
    ['48a29', '4829'],
    ['12345678', '123456'],
  ])('reads %j as %j', (typed, code) => {
    expect(toSignInCode(typed)).toBe(code);
  });
});
