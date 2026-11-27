/**
 * Thrown on purpose by the smoke route. The message says so, because it lands in Sentry and in the
 * Telegram ops chat, where an unexplained 5xx would read as an outage.
 */
export class OpsSmokeError extends Error {
  public constructor() {
    super('Deliberate smoke-test failure from POST /api/ops/smoke-error; nothing is broken.');
    this.name = 'OpsSmokeError';
  }
}
