import { afterAll, afterEach, beforeEach, vi } from 'vitest';

import { prisma } from '@/lib/db';

import { fakeCounterStore, fakeGoogle, offlineNetwork } from './network';
import { TRUNCATE_ALL_TABLES_SQL } from './testDatabaseUrl';

beforeEach(async () => {
  offlineNetwork.mockReset();
  vi.stubGlobal('fetch', offlineNetwork);
  fakeCounterStore.reset();
  fakeGoogle.reset();
  await prisma.$executeRawUnsafe(TRUNCATE_ALL_TABLES_SQL);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await prisma.$disconnect();
});
