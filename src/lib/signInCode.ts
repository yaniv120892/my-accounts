// Shared by the server and the sign-in form, so it imports nothing server-only.

export const SIGN_IN_CODE_LENGTH = 6;
export const SIGN_IN_CODE_TTL_SECONDS = 10 * 60;
/** Wrong guesses one code survives; the next guess voids it and the person asks for a new one. */
export const SIGN_IN_CODE_ALLOWED_ATTEMPTS = 5;

/** Unanchored, as an HTML `pattern` attribute wants it. */
export const SIGN_IN_CODE_PATTERN = `\\d{${SIGN_IN_CODE_LENGTH}}`;

// No lookbehind: older Safari cannot parse it, and this module loads on the sign-in page.
const STANDALONE_CODE = new RegExp(`(?:^|\\D)(${SIGN_IN_CODE_PATTERN})(?!\\d)`);

/**
 * What is typed or pasted, as a code. A paste can be a whole sentence from the mail
 * ("code 482913, valid 10 minutes"), so a standalone run of six digits wins; otherwise the digits
 * are kept up to six, which also joins "123 456".
 */
export function toSignInCode(typed: string): string {
  const standalone = typed.match(STANDALONE_CODE)?.[1];
  return standalone ?? typed.replace(/\D/g, '').slice(0, SIGN_IN_CODE_LENGTH);
}
