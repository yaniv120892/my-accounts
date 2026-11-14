'use client';

import { Button } from '@mui/material';
import { useState } from 'react';

import { useT } from '@/i18n/useT';
import { authClient } from '@/lib/authClient';

export function SignOutButton() {
  const t = useT();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut(): Promise<void> {
    setIsSigningOut(true);
    await authClient.signOut();
    window.location.assign('/sign-in');
  }

  return (
    <Button
      variant="outlined"
      size="large"
      disabled={isSigningOut}
      onClick={signOut}
      sx={{ minHeight: 48 }}
    >
      {isSigningOut ? t('home.signingOut') : t('home.signOut')}
    </Button>
  );
}
