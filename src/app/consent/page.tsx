import { Box, Typography } from '@mui/material';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { AccountCard } from '@/components/AccountCard';
import { ConsentForm } from '@/components/auth/ConsentForm';
import { getTranslator } from '@/i18n/getTranslator';
import { richText } from '@/i18n/richText';
import { auth } from '@/lib/auth';
import { consentScopeMessageKeys } from '@/lib/consentScopes';

type ConsentPageProps = {
  searchParams: Promise<{ client_id?: string; scope?: string }>;
};

/**
 * Only a client created without `skip_consent` lands here; the suite's own apps never do. The
 * accept or deny posts carry the signed query back, so the authorize resumes either way.
 */
export default async function ConsentPage({ searchParams }: ConsentPageProps) {
  const { client_id: clientId, scope } = await searchParams;
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session || !clientId) {
    redirect('/sign-in');
  }
  const { t } = await getTranslator();
  const clientName = await publicClientName({ clientId, requestHeaders });

  return (
    <AccountCard title={t('consent.title')}>
      <Typography sx={{ mb: 1 }}>
        {richText({
          template: t('consent.intro'),
          nodes: { client: <b>{clientName ?? t('consent.unknownClient')}</b> },
        })}
      </Typography>
      <Box component="ul" sx={{ mt: 0, mb: 2.5, ps: 3 }}>
        {consentScopeMessageKeys(scope).map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </Box>
      <ConsentForm />
    </AccountCard>
  );
}

async function publicClientName({
  clientId,
  requestHeaders,
}: {
  clientId: string;
  requestHeaders: Headers;
}): Promise<string | null> {
  try {
    const client = await auth.api.getOAuthClientPublic({
      query: { client_id: clientId },
      headers: requestHeaders,
    });
    return client.client_name ?? null;
  } catch {
    return null;
  }
}
