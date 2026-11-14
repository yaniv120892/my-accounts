import type * as SentryModule from '@sentry/nextjs';
import { z } from 'zod';

type SentryInitOptions = Parameters<typeof SentryModule.init>[0];
type TransportOptions = Parameters<typeof SentryModule.createTransport>[0];
type SentEvent = { tags: Record<string, unknown>; extra: Record<string, unknown> };

const TEST_DSN = 'https://public@o0.ingest.sentry.io/0';

export const sentEnvelopes: string[] = [];

const SOURCE_CONTEXT_KEYS = new Set(['pre_context', 'context_line', 'post_context']);

/**
 * The envelopes without the source lines Sentry attaches to each stack frame:
 * those quote the spec's own code, not anything the app sent.
 */
export function sentPayloads(): string {
  return sentEnvelopes
    .flatMap((envelope) => envelope.split('\n'))
    .map((line) =>
      JSON.stringify(JSON.parse(line), (key, value: unknown) =>
        SOURCE_CONTEXT_KEYS.has(key) ? undefined : value,
      ),
    )
    .join('\n');
}

/**
 * For `vi.mock('@sentry/nextjs', …)`: the real SDK, initialised as the app
 * initialises it, with only the network send replaced by a capture.
 */
export async function sentryWithCapturedTransport(
  importOriginal: () => Promise<typeof SentryModule>,
): Promise<typeof SentryModule> {
  const Sentry = await importOriginal();
  return {
    ...Sentry,
    init: function initCapturingSends(options: SentryInitOptions) {
      return Sentry.init({
        ...options,
        transport: (transportOptions: TransportOptions) =>
          Sentry.createTransport(transportOptions, async (request) => {
            sentEnvelopes.push(
              typeof request.body === 'string'
                ? request.body
                : new TextDecoder().decode(request.body),
            );
            return { statusCode: 200 };
          }),
      });
    },
  };
}

export function enableSentry(): void {
  process.env.NEXT_PUBLIC_SENTRY_DSN = TEST_DSN;
}

/**
 * The real SDK, started directly, for a spec whose setup loaded Sentry before
 * a `vi.mock` could replace it.
 */
export function captureSentrySends(Sentry: typeof SentryModule): void {
  enableSentry();
  Sentry.init({
    dsn: TEST_DSN,
    transport: (transportOptions: TransportOptions) =>
      Sentry.createTransport(transportOptions, async (request) => {
        sentEnvelopes.push(
          typeof request.body === 'string' ? request.body : new TextDecoder().decode(request.body),
        );
        return { statusCode: 200 };
      }),
  });
}

const sentEventSchema = z.object({
  tags: z.record(z.string(), z.unknown()).optional(),
  extra: z.record(z.string(), z.unknown()).optional(),
});

/** Only allow-listed context keys become tags; every context value is in `extra`. */
export async function sentEvents(Sentry: typeof SentryModule): Promise<SentEvent[]> {
  await Sentry.flush(2_000);
  return sentEnvelopes
    .flatMap((envelope) => envelope.split('\n'))
    .map((line) => sentEventSchema.safeParse(JSON.parse(line)))
    .flatMap((parsed) =>
      parsed.success && parsed.data.tags
        ? [{ tags: parsed.data.tags, extra: parsed.data.extra ?? {} }]
        : [],
    );
}
