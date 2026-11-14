import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// Vitest does not read .env the way `next dev` does, and the integration
// project needs TEST_DATABASE_URL from it.
const envFile = path.join(projectRoot, '.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const integrationTests = 'src/test/integration/**/*.test.ts';
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? '';

// The shared design package imports next/* subpaths, which Node's ESM resolver
// cannot find because Next publishes no exports map; inlining lets Vite resolve them.
// The observability package is inlined so a spec's vi.mock('@sentry/nextjs')
// reaches the Sentry calls it makes.
const inlineSharedPackages = {
  deps: { inline: ['@yaniv120892/my-ui', '@yaniv120892/observability'] },
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${path.join(projectRoot, 'src')}/` },
      // Node's `node` condition picks the SDK's CommonJS build, whose re-exports
      // of @sentry/node (captureException, flush, …) an ESM import cannot see.
      {
        find: /^@sentry\/nextjs$/,
        replacement: path.join(
          projectRoot,
          'node_modules/@sentry/nextjs/build/esm/index.server.js',
        ),
      },
    ],
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          server: inlineSharedPackages,
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./src/test/setup.ts'],
          // A key in .env must not send unit-test events to the real project.
          env: { POSTHOG_PROJECT_KEY: '' },
          include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
          exclude: [integrationTests],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          server: inlineSharedPackages,
          environment: 'node',
          include: [integrationTests],
          // Set before any worker imports @/lib/db, so the Prisma singleton
          // never sees the dev DATABASE_URL from .env.
          env: {
            DATABASE_URL: testDatabaseUrl,
            DATABASE_URL_UNPOOLED: testDatabaseUrl,
            BETTER_AUTH_URL: 'https://accounts.test',
            BETTER_AUTH_SECRET: 'integration-test-secret-integration-test-secret',
            TRUSTED_CLIENT_IDS: '',
            GOOGLE_CLIENT_ID: '',
            GOOGLE_CLIENT_SECRET: '',
            // The daily mail budget fails closed on production; the store below answers it.
            VERCEL_ENV: 'production',
            // Served by the in-memory store in helpers/network.ts.
            UPSTASH_REDIS_REST_URL: 'https://counter-store.test',
            UPSTASH_REDIS_REST_TOKEN: 'integration-test-token',
            POSTHOG_PROJECT_KEY: '',
            POSTHOG_HOST: '',
            SMTP_USER: '',
            SMTP_PASSWORD: '',
            LOG_LEVEL: 'silent',
          },
          globalSetup: ['./src/test/integration/helpers/globalSetup.ts'],
          setupFiles: [
            './src/test/integration/helpers/stubNetwork.ts',
            './src/test/integration/helpers/setupIntegration.ts',
          ],
          // One shared database, truncated between cases.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
