import type { Locale, Translate } from '@yaniv120892/my-ui';
import { createTranslator, getLocale } from '@yaniv120892/my-ui/server';

import { type AppMessages, messages } from './messages';

export async function getTranslator(): Promise<{ locale: Locale; t: Translate<AppMessages> }> {
  const locale = await getLocale();
  return { locale, t: createTranslator({ locale, messages: messages[locale] }) };
}
