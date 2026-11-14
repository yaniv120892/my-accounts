'use client';

import PersonIcon from '@mui/icons-material/Person';
import { Avatar, Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { LanguageToggle } from '@yaniv120892/my-ui';
import type { ReactNode } from 'react';

import { useT } from '@/i18n/useT';

type AccountCardProps = {
  title: string;
  children: ReactNode;
};

/**
 * The centred card of my-ui's `AuthCard`, with the account's own mark: `AuthCard` takes an app
 * id, and my-accounts is the suite's sign-in rather than one of its apps.
 */
export function AccountCard({ title, children }: AccountCardProps) {
  const t = useT();
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', px: 2, py: 4 }}>
      <Stack spacing={3} sx={{ width: '100%', maxWidth: 400, alignItems: 'center' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
            <PersonIcon />
          </Avatar>
          <Typography variant="h2" component="p">
            {t('app.name')}
          </Typography>
        </Stack>
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h3" component="h1" sx={{ mb: 2.5 }}>
              {title}
            </Typography>
            {children}
          </CardContent>
        </Card>
        <LanguageToggle />
      </Stack>
    </Box>
  );
}
