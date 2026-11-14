'use client';

import { Alert, Button, Stack } from '@mui/material';
import { useState } from 'react';

import { useT } from '@/i18n/useT';
import { authClient } from '@/lib/authClient';
import { nextLocationAfterSignIn } from '@/lib/signInOutcome';

export function ConsentForm() {
  const t = useT();
  const [isDeciding, setIsDeciding] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  async function decide(accept: boolean): Promise<void> {
    setIsDeciding(true);
    setHasFailed(false);
    const { data, error } = await authClient.oauth2.consent({ accept });
    if (error) {
      setHasFailed(true);
      setIsDeciding(false);
      return;
    }
    window.location.assign(nextLocationAfterSignIn(data));
  }

  return (
    <Stack spacing={1.5}>
      {hasFailed ? <Alert severity="error">{t('consent.failed')}</Alert> : null}
      <Button
        variant="contained"
        size="large"
        disabled={isDeciding}
        onClick={() => decide(true)}
        sx={{ minHeight: 48 }}
      >
        {t('consent.allow')}
      </Button>
      <Button
        variant="text"
        size="large"
        disabled={isDeciding}
        onClick={() => decide(false)}
        sx={{ minHeight: 48 }}
      >
        {t('consent.deny')}
      </Button>
    </Stack>
  );
}
