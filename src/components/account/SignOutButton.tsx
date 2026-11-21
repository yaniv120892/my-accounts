'use client';

import { Alert, Button, Stack } from '@mui/material';
import { useState } from 'react';

import { useT } from '@/i18n/useT';
import { authClient } from '@/lib/authClient';
import { SIGN_IN_PAGE } from '@/lib/authPaths';

export function SignOutButton() {
  const t = useT();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  // On a shared phone, "signed out" must mean it: a failed sign-out stays here and says so.
  async function signOut(): Promise<void> {
    setIsSigningOut(true);
    setHasFailed(false);
    const { error } = await authClient.signOut();
    if (error) {
      setIsSigningOut(false);
      setHasFailed(true);
      return;
    }
    window.location.assign(SIGN_IN_PAGE);
  }

  return (
    <Stack spacing={1.5}>
      {hasFailed && <Alert severity="error">{t('home.signOutFailed')}</Alert>}
      <Button
        variant="outlined"
        size="large"
        disabled={isSigningOut}
        onClick={signOut}
        sx={{ minHeight: 48 }}
      >
        {isSigningOut ? t('home.signingOut') : t('home.signOut')}
      </Button>
    </Stack>
  );
}
