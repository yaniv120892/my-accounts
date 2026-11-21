import { vi } from 'vitest';

import { offlineNetwork } from './network';

// Its own setup file, run before any other imports `@/lib/observability`: the
// PostHog client keeps the `fetch` it was built with.
vi.stubGlobal('fetch', offlineNetwork);
