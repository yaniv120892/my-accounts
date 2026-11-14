import { defineConfig, devices } from '@playwright/test';

import {
  E2E_AUTH_SECRET,
  E2E_MAIL_OUTBOX,
  E2E_ORIGIN,
  E2E_PORT,
  e2eDatabaseUrl,
} from './e2e/support/e2eEnvironment';

const databaseUrl = e2eDatabaseUrl();

/**
 * Browser specs against `next dev` on its own port and its own disposable database. The server's
 * environment overrides .env, so it never sees the DATABASE_URL a developer points at a real one.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/support/globalSetup.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: E2E_ORIGIN,
    locale: 'en-US',
    trace: 'retain-on-failure',
    ...devices['Pixel 7'],
    // The narrowest phone the suite supports.
    viewport: { width: 400, height: 800 },
  },
  webServer: {
    command: `npx next dev --port ${E2E_PORT}`,
    url: `${E2E_ORIGIN}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      DATABASE_URL: databaseUrl,
      DATABASE_URL_UNPOOLED: databaseUrl,
      BETTER_AUTH_SECRET: E2E_AUTH_SECRET,
      BETTER_AUTH_URL: E2E_ORIGIN,
      TRUSTED_CLIENT_IDS: '',
      DEV_MAIL_OUTBOX: E2E_MAIL_OUTBOX,
      POSTHOG_PROJECT_KEY: '',
      NEXT_PUBLIC_SENTRY_DSN: '',
      BETTERSTACK_SOURCE_URL: '',
      TELEGRAM_BOT_TOKEN: '',
      GOOGLE_CLIENT_ID: '',
      GOOGLE_CLIENT_SECRET: '',
      SMTP_USER: '',
      UPSTASH_REDIS_REST_URL: '',
      KV_REST_API_URL: '',
      LOG_LEVEL: 'warn',
    },
  },
});
