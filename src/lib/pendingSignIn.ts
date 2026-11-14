import { z } from 'zod';

import { SIGN_IN_CODE_TTL_SECONDS } from './signInCode';

const PENDING_SIGN_IN_KEY = 'pending-sign-in';

const pendingSignInSchema = z.object({ email: z.string(), expiresAt: z.number() });

type PendingSignIn = z.infer<typeof pendingSignInSchema>;

const listeners = new Set<() => void>();
/** Mirrors storage, so the code step still shows where storage is missing (a private window). */
let inMemory: PendingSignIn | null = null;

/**
 * The address a code was mailed to, kept on this device while the code lives:
 * a home-screen app is often reloaded while the person reads the mail, and the
 * code step must still be there when they come back.
 */
export function rememberPendingSignIn(email: string): void {
  inMemory = { email, expiresAt: Date.now() + SIGN_IN_CODE_TTL_SECONDS * 1000 };
  writeStorage(JSON.stringify(inMemory));
  notifyListeners();
}

export function forgetPendingSignIn(): void {
  discardPendingSignIn();
  notifyListeners();
}

/**
 * Once signed in, by the code or with Google: clears it without redrawing a
 * form behind a page that is navigating away.
 */
export function discardPendingSignIn(): void {
  inMemory = null;
  writeStorage(null);
}

export function pendingSignInEmail(): string | null {
  // This tab's copy first: a failed write would leave an older address in storage.
  return liveEmailOf(inMemory) ?? liveEmailOf(readStorage());
}

export function subscribeToPendingSignIn(listener: () => void): () => void {
  listeners.add(listener);
  return function unsubscribe() {
    listeners.delete(listener);
  };
}

function liveEmailOf(pending: PendingSignIn | null): string | null {
  const isLive = pending !== null && pending.expiresAt > Date.now();
  return isLive ? pending.email : null;
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

function readStorage(): PendingSignIn | null {
  try {
    const parsed = pendingSignInSchema.safeParse(
      JSON.parse(window.localStorage.getItem(PENDING_SIGN_IN_KEY) ?? 'null'),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeStorage(value: string | null): void {
  try {
    if (value === null) {
      window.localStorage.removeItem(PENDING_SIGN_IN_KEY);
    } else {
      window.localStorage.setItem(PENDING_SIGN_IN_KEY, value);
    }
  } catch {
    // Without storage the in-memory copy carries the code step until a reload.
  }
}
