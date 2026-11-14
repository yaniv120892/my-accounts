'use client';

import GoogleIcon from '@mui/icons-material/Google';
import { Alert, Button, Divider, Stack, TextField, Typography } from '@mui/material';
import type { FormEvent } from 'react';
import { useState, useSyncExternalStore } from 'react';

import { useT } from '@/i18n/useT';
import { authClient } from '@/lib/authClient';
import {
  forgetPendingSignIn,
  pendingSignInEmail,
  rememberPendingSignIn,
  subscribeToPendingSignIn,
} from '@/lib/pendingSignIn';
import { codeRequestErrorMessageKey } from '@/lib/signInOutcome';

import { SignInCodeForm } from './SignInCodeForm';

type SignInFormProps = {
  googleEnabled: boolean;
  /** Already translated: comes from the `?error=` the Google callback returned with. */
  errorMessage: string | null;
};

/** Where Better Auth sends a failed Google sign-in; the page reads `error` from it. */
const GOOGLE_ERROR_PATH = '/sign-in?error=google';

export function SignInForm({ googleEnabled, errorMessage }: SignInFormProps) {
  const t = useT();
  const [email, setEmail] = useState('');
  const sentTo = useSyncExternalStore(
    subscribeToPendingSignIn,
    pendingSignInEmail,
    noPendingSignInOnServer,
  );
  const [error, setError] = useState<string | null>(errorMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleEmailSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const { error: requestError } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: 'sign-in',
    });
    setIsSubmitting(false);
    if (requestError) {
      setError(t(codeRequestErrorMessageKey(requestError)));
      return;
    }
    rememberPendingSignIn(email);
  }

  async function signInWithGoogle(): Promise<void> {
    setError(null);
    // The client plugin carries this page's oauth_query into the Google round trip, so the
    // callback resumes the authorize that sent the person here.
    const { data, error: googleError } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/',
      errorCallbackURL: GOOGLE_ERROR_PATH,
    });
    if (googleError || !data?.url) {
      setError(t('auth.error.googleFailed'));
      return;
    }
    window.location.assign(data.url);
  }

  function startOver(): void {
    forgetPendingSignIn();
    setError(null);
  }

  return (
    <Stack spacing={2.5}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('auth.signIn.intro')}
      </Typography>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {googleEnabled ? (
        <>
          <Button
            variant="outlined"
            color="inherit"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={signInWithGoogle}
            sx={{ minHeight: 48 }}
          >
            {t('auth.google')}
          </Button>
          <Divider sx={{ typography: 'caption', color: 'text.secondary' }}>{t('auth.or')}</Divider>
        </>
      ) : null}

      {sentTo ? (
        <SignInCodeForm email={sentTo} onRestart={startOver} />
      ) : (
        <Stack component="form" spacing={2} onSubmit={handleEmailSubmit}>
          <TextField
            type="email"
            label={t('auth.email')}
            value={email}
            required
            fullWidth
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            slotProps={{ htmlInput: { dir: 'ltr' } }}
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isSubmitting}
            sx={{ minHeight: 48 }}
          >
            {isSubmitting ? t('auth.sending') : t('auth.sendCode')}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

function noPendingSignInOnServer(): null {
  return null;
}
