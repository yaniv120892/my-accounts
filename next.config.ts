import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { withSentryConfig } from '@sentry/nextjs/config';
import { securityHeaders } from '@yaniv120892/app-kit/security-headers';
import type { NextConfig } from 'next';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: projectRoot,
  },
  // pino resolves its worker files at runtime, which a bundled copy cannot.
  serverExternalPackages: ['pino', 'pino-pretty'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders() }];
  },
};

const canUploadSourceMaps = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
);

export default withSentryConfig(nextConfig, {
  sourcemaps: { disable: !canUploadSourceMaps },
  release: { create: canUploadSourceMaps },
  widenClientFileUpload: true,
  // Tracing is off everywhere, so its SDK code is dead weight in the bundle.
  bundleSizeOptimizations: { excludeTracing: true, excludeDebugStatements: true },
  telemetry: false,
  silent: !process.env.CI,
});
