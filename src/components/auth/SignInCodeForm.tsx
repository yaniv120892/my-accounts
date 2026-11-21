'use client';

import { Alert, Button, Stack, TextField } from '@mui/material';
import type { FormEvent } from 'react';
import { useRef, useState } from 'react';

import { richText } from '@/i18n/richText';
import { useT } from '@/i18n/useT';
import { authClient } from '@/lib/authClient';
import { discardPendingSignIn } from '@/lib/pendingSignIn';
import { SIGN_IN_CODE_PATTERN, toSignInCode } from '@/lib/signInCode';
import { codeErrorMessageKey, nextLocationAfterSignIn } from '@/lib/signInOutcome';

type SignInCodeFormProps = {
  email: string;
  onRestart: () => void;
};

/**
 * Signs in with the code from the mail. The session cookie lands on this fetch's response, in the
 * browser that typed the code. In the middle of an authorize, the answer names the suite app's
 * callback, and the browser goes there.
 */
export function SignInCodeForm({ email, onRestart }: SignInCodeFormProps) {
  const t = useT();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State lags a render behind, so a fast second Enter would post again and count as a wrong guess.
  const submittingRef = useRef(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setError(null);
    setIsSubmitting(true);

    const { data, error: signInError } = await authClient.signIn.emailOtp({ email, otp: code });
    if (signInError) {
      setError(t(codeErrorMessageKey(signInError)));
      submittingRef.current = false;
      setIsSubmitting(false);
      return;
    }
    discardPendingSignIn();
    window.location.assign(nextLocationAfterSignIn(data));
  }

  return (
    <Stack component="form" spacing={2} onSubmit={handleSubmit}>
      <Alert severity="success" role="status">
        {richText({
          template: t('auth.sentTo'),
          nodes: { email: <bdi dir="ltr">{email}</bdi> },
        })}
      </Alert>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <TextField
        label={t('auth.code')}
        value={code}
        required
        fullWidth
        autoFocus
        autoComplete="one-time-code"
        onChange={(event) => setCode(toSignInCode(event.target.value))}
        slotProps={{
          htmlInput: { dir: 'ltr', inputMode: 'numeric', pattern: SIGN_IN_CODE_PATTERN },
        }}
      />
      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={isSubmitting}
        sx={{ minHeight: 48 }}
      >
        {isSubmitting ? t('auth.signingIn') : t('auth.signInWithCode')}
      </Button>
      <Button variant="text" onClick={onRestart}>
        {t('auth.otherEmail')}
      </Button>
    </Stack>
  );
}
