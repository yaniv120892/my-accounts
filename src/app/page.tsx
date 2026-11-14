import { Stack, Typography } from '@mui/material';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/components/account/SignOutButton';
import { AccountCard } from '@/components/AccountCard';
import { getTranslator } from '@/i18n/getTranslator';
import { richText } from '@/i18n/richText';
import { SIGN_IN_PAGE } from '@/lib/authPaths';
import { currentSession } from '@/lib/session';

export default async function AccountPage() {
  const session = await currentSession();
  if (!session) {
    redirect(SIGN_IN_PAGE);
  }
  const { t } = await getTranslator();

  return (
    <AccountCard title={t('home.title')}>
      <Stack spacing={2.5}>
        <Typography>
          {richText({
            template: t('home.signedInAs'),
            nodes: { email: <bdi dir="ltr">{session.user.email}</bdi> },
          })}
        </Typography>
        <SignOutButton />
      </Stack>
    </AccountCard>
  );
}
