import type { Dictionary } from '@yaniv120892/my-ui';

import { appEn, appHe } from './messages/app';
import { authEn, authHe } from './messages/auth';
import { consentEn, consentHe } from './messages/consent';
import { homeEn, homeHe } from './messages/home';

/** Per-feature message files; the parity test also checks no two areas define the same key. */
export const MESSAGE_AREAS = [
  { name: 'app', en: appEn, he: appHe },
  { name: 'auth', en: authEn, he: authHe },
  { name: 'consent', en: consentEn, he: consentHe },
  { name: 'home', en: homeEn, he: homeHe },
] as const;

const en = { ...appEn, ...authEn, ...consentEn, ...homeEn };

export type AppMessages = typeof en;
export type AppMessageKey = keyof AppMessages & string;

export const messages: Dictionary<AppMessages> = {
  en,
  he: { ...appHe, ...authHe, ...consentHe, ...homeHe },
};
