import { createUpstashCounterStore } from '@yaniv120892/app-kit/counter-store';
import { createDailyBudget } from '@yaniv120892/app-kit/daily-budget';
import { createRateLimiter } from '@yaniv120892/app-kit/rate-limit';

import { readCounterStoreConfig } from './counterStoreConfig';
import { logger, observability } from './observability';

/**
 * The one counter store behind every rate limit and daily budget. Unset on a
 * development server or a preview, every guard lets requests through; unset on
 * production (`VERCEL_ENV=production`), each one fails per its own policy.
 */
export const counterStore = createUpstashCounterStore(readCounterStoreConfig(process.env));

const guardReporting = { logger, alerts: observability };

export const rateLimiter = createRateLimiter({ store: counterStore, ...guardReporting });

export const dailyBudget = createDailyBudget({ store: counterStore, ...guardReporting });
