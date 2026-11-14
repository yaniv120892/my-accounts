'use client';

import { useTranslations } from '@yaniv120892/my-ui';

import type { AppMessages } from './messages';

export const useT = () => useTranslations<AppMessages>();
