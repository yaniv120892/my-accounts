// Shared by the sign-in and consent forms, so it imports nothing server-only.
import { z } from 'zod';

import type { AppMessageKey } from '@/i18n/messages';

type AuthClientError = { status: number; code?: string | undefined };

const HOME_PATH = '/';
const TOO_MANY_REQUESTS = 429;

const redirectAnswerSchema = z.object({ redirect: z.literal(true), url: z.string().min(1) });

/**
 * Where the browser goes once signed in. In the middle of an authorize the answer is
 * `{ redirect: true, url }` naming the suite app's callback (or the consent page); a sign-in
 * opened directly answers with the user, and the person lands on their account page.
 */
export function nextLocationAfterSignIn(answer: unknown): string {
  const redirect = redirectAnswerSchema.safeParse(answer);
  return redirect.success ? redirect.data.url : HOME_PATH;
}

export function codeErrorMessageKey(error: AuthClientError): AppMessageKey {
  if (error.status === TOO_MANY_REQUESTS) {
    return 'auth.error.rateLimited';
  }
  switch (error.code) {
    case 'INVALID_OTP':
    case 'OTP_EXPIRED':
      return 'auth.error.codeInvalid';
    case 'TOO_MANY_ATTEMPTS':
      return 'auth.error.tooManyAttempts';
    default:
      return 'auth.error.signInFailed';
  }
}

export function codeRequestErrorMessageKey(error: AuthClientError): AppMessageKey {
  return error.status === TOO_MANY_REQUESTS ? 'auth.error.rateLimited' : 'auth.error.requestFailed';
}
