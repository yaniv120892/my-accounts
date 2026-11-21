import { vi } from 'vitest';
import { z } from 'zod';

const POSTHOG_BATCH_URL = 'https://us.i.posthog.com/batch/';
/** `UPSTASH_REDIS_REST_URL` in the integration project's env. */
const TEST_COUNTER_STORE_URL = 'https://counter-store.test';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const counts = new Map<string, number>();
let isCounterStoreDown = false;
let googleTokenAnswer: unknown = null;

/** What Google's token endpoint answers a code exchange with; unset fails the case. */
export const fakeGoogle = {
  reset(): void {
    googleTokenAnswer = null;
  },
  answerTokenRequestWith(body: unknown): void {
    googleTokenAnswer = body;
  },
};

/**
 * The counter store's REST API, held in memory, so every daily budget runs its real code path.
 * Emptied before each case.
 */
export const fakeCounterStore = {
  reset(): void {
    counts.clear();
    isCounterStoreDown = false;
  },
  /** Every count fails with a 500 until the next case. */
  goDown(): void {
    isCounterStoreDown = true;
  },
};

/** One stub for the whole file, installed by `stubNetwork.ts`. */
export const offlineNetwork = vi.fn(offlineFetch);

/**
 * No case reaches the network: PostHog accepts every batch, the counter store answers from
 * memory, and any other outbound request fails the case loudly.
 */
async function offlineFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = input instanceof Request ? input.url : String(input);
  if (url === POSTHOG_BATCH_URL) {
    return Response.json({ status: 1 });
  }
  if (url === GOOGLE_TOKEN_URL && googleTokenAnswer !== null) {
    return Response.json(googleTokenAnswer);
  }
  if (url === `${TEST_COUNTER_STORE_URL}/multi-exec`) {
    return answerCounterStore(init);
  }
  throw new Error(`Integration tests make no network calls, but one went to ${url}`);
}

const multiExecSchema = z.tuple([
  z.tuple([z.literal('INCR'), z.string()]),
  z.tuple([z.literal('EXPIRE'), z.string(), z.string()]),
]);

function answerCounterStore(init: RequestInit | undefined): Response {
  if (isCounterStoreDown) {
    return new Response('down', { status: 500 });
  }
  const [[, key]] = multiExecSchema.parse(JSON.parse(String(init?.body)));
  const hits = (counts.get(key) ?? 0) + 1;
  counts.set(key, hits);
  return Response.json([{ result: hits }, { result: 1 }]);
}
