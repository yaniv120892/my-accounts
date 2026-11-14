import { redirect } from 'next/navigation';

import { AccountCard } from '@/components/AccountCard';
import { SignInForm } from '@/components/auth/SignInForm';
import { getTranslator } from '@/i18n/getTranslator';
import { googleCredentials } from '@/lib/authSettings';
import { currentSession } from '@/lib/session';

type SignInPageProps = {
  searchParams: Promise<{ error?: string; sig?: string }>;
};

/**
 * Reached directly, or from `/oauth2/authorize` with the signed authorize request in the query
 * (`sig` and the parameters it covers). The form's posts carry that query back, so signing in
 * here resumes the authorize.
 */
export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { error, sig } = await searchParams;
  const isResumingAuthorize = Boolean(sig);
  if (!isResumingAuthorize && (await currentSession())) {
    redirect('/');
  }
  const { t } = await getTranslator();

  return (
    <AccountCard title={t('auth.signIn.title')}>
      <SignInForm
        googleEnabled={googleCredentials() !== null}
        errorMessage={error ? t('auth.error.googleFailed') : null}
      />
    </AccountCard>
  );
}
