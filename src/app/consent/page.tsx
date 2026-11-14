import { Box, Typography } from '@mui/material';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isAPIError } from 'better-auth/api';

import { AccountCard } from '@/components/AccountCard';
import { ConsentForm } from '@/components/auth/ConsentForm';
import { getTranslator } from '@/i18n/getTranslator';
import { richText } from '@/i18n/richText';
import { auth } from '@/lib/auth';
import { SIGN_IN_PAGE } from '@/lib/authPaths';
import { consentScopeMessageKeys } from '@/lib/consentScopes';
import { currentSession } from '@/lib/session';

type ConsentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const CLIENT_NOT_FOUND_STATUS = 'NOT_FOUND';

/**
 * Only a client created without `skip_consent` lands here; the suite's own apps never do. The
 * accept or deny posts carry the signed query back, so the authorize resumes either way.
 */
export default async function ConsentPage({ searchParams }: ConsentPageProps) {
  const query = await searchParams;
  const clientId = singleValue(query.client_id);
  const scope = singleValue(query.scope);
  const [session, { t }, requestHeaders] = await Promise.all([
    currentSession(),
    getTranslator(),
    headers(),
  ]);
  if (!session || !clientId) {
    // The signed authorize query goes along, so signing in again resumes it.
    redirect(`${SIGN_IN_PAGE}?${toSearchParams(query).toString()}`);
  }
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
  } catch (error) {
    // Only an unknown client gets the "unknown app" wording; a fault goes to `onRequestError`.
    const isUnknownClient = isAPIError(error) && error.status === CLIENT_NOT_FOUND_STATUS;
    if (isUnknownClient) {
      return null;
    }
    throw error;
  }
}

function singleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toSearchParams(query: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const item of [value ?? []].flat()) {
      params.append(key, item);
    }
  }
  return params;
}
