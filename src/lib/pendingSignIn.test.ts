// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  discardPendingSignIn,
  forgetPendingSignIn,
  pendingSignInEmail,
  rememberPendingSignIn,
  subscribeToPendingSignIn,
} from './pendingSignIn';
import { SIGN_IN_CODE_TTL_SECONDS } from './signInCode';

const CODE_TTL_MS = SIGN_IN_CODE_TTL_SECONDS * 1000;

const STORAGE_KEY = 'pending-sign-in';
const EMAIL = 'dana@example.com';

class MemoryStorage {
  public readonly items = new Map<string, string>();
  public failWrites = false;

  public getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    if (this.failWrites) {
      throw new Error('QuotaExceededError');
    }
    this.items.set(key, value);
  }

  public removeItem(key: string): void {
    this.items.delete(key);
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  vi.useFakeTimers();
  storage = new MemoryStorage();
  vi.stubGlobal('window', { localStorage: storage });
});

afterEach(() => {
  forgetPendingSignIn();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('pending sign-in', () => {
  it('offers the code step while the code lives, and not after', () => {
    rememberPendingSignIn(EMAIL);
    expect(pendingSignInEmail()).toBe(EMAIL);

    vi.advanceTimersByTime(CODE_TTL_MS + 1);
    expect(pendingSignInEmail()).toBeNull();
  });

  it('survives a reload: a fresh module reads it back from storage', async () => {
    rememberPendingSignIn(EMAIL);
    vi.resetModules();
    const reloaded = await import('./pendingSignIn');
    expect(reloaded.pendingSignInEmail()).toBe(EMAIL);
  });

  it('falls back to a live stored code when this tab holds an expired one', () => {
    rememberPendingSignIn('old@example.com');
    vi.advanceTimersByTime(CODE_TTL_MS + 1);
    // Another tab asked again: storage is fresh, this tab's copy is not.
    storage.items.set(STORAGE_KEY, JSON.stringify({ email: EMAIL, expiresAt: Date.now() + 1000 }));
    expect(pendingSignInEmail()).toBe(EMAIL);
  });

  it('ignores what it cannot read from storage', () => {
    storage.items.set(STORAGE_KEY, '{not json');
    expect(pendingSignInEmail()).toBeNull();
    storage.items.set(STORAGE_KEY, JSON.stringify({ email: EMAIL }));
    expect(pendingSignInEmail()).toBeNull();
  });

  it('keeps the newest address when storage refuses the write', () => {
    rememberPendingSignIn('old@example.com');
    storage.failWrites = true;
    rememberPendingSignIn(EMAIL);
    expect(pendingSignInEmail()).toBe(EMAIL);
  });

  it('forget tells the form to redraw; discard clears without it', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToPendingSignIn(listener);
    rememberPendingSignIn(EMAIL);
    discardPendingSignIn();
    expect(pendingSignInEmail()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);

    forgetPendingSignIn();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});
