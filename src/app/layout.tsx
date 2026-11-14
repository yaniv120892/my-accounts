import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { DesignProvider } from '@yaniv120892/my-ui';
import { getLocale, localeDirection } from '@yaniv120892/my-ui/server';
import type { Metadata, Viewport } from 'next';
import { Heebo } from 'next/font/google';

import { SUITE_APP_URLS } from '@/config/appUrls';
import { getTranslator } from '@/i18n/getTranslator';
import { messages } from '@/i18n/messages';

import './globals.css';

const heebo = Heebo({
  variable: '--font-sans',
  subsets: ['hebrew', 'latin'],
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t('app.name'),
    description: t('meta.description'),
    applicationName: t('app.name'),
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // The shared palette's background.default for each scheme.
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#101216' },
    { media: '(prefers-color-scheme: light)', color: '#f7f7f9' },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      dir={localeDirection(locale)}
      className={heebo.variable}
      suppressHydrationWarning
    >
      <body>
        <InitColorSchemeScript attribute="data" />
        <DesignProvider locale={locale} messages={messages[locale]} appUrls={SUITE_APP_URLS}>
          {children}
        </DesignProvider>
      </body>
    </html>
  );
}
