type CounterStoreEnv = Record<string, string | undefined>;

type CounterStoreConfig = {
  url: string | undefined;
  token: string | undefined;
};

/**
 * A hand-made Upstash database is named `UPSTASH_REDIS_REST_*`; the Vercel Marketplace
 * integration names the same pair `KV_REST_API_*`. The pair is read whole, so a URL never
 * meets the other database's token.
 */
export function readCounterStoreConfig(env: CounterStoreEnv): CounterStoreConfig {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return { url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN };
  }
  return { url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN };
}
