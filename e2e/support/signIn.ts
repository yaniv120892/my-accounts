import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

import { expect, type Page } from '@playwright/test';
import { z } from 'zod';

import { E2E_AUTH_SECRET, E2E_MAIL_OUTBOX, E2E_ORIGIN, e2eDatabaseUrl } from './e2eEnvironment';

const outboxLineSchema = z.object({ to: z.string(), text: z.string() });
const CODE_IN_MAIL = /\b(\d{6})\b/;

/** Asks for a code from the sign-in form, as a person does, and reads it from the outbox. */
export async function requestSignInCode({
  page,
  email,
}: {
  page: Page;
  email: string;
}): Promise<string> {
  const mailsBefore = mailsTo(email).length;
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send sign-in code' }).click();
  await page.getByLabel('Sign-in code').waitFor();
  await expect.poll(() => mailsTo(email).length).toBeGreaterThan(mailsBefore);
  const code = CODE_IN_MAIL.exec(mailsTo(email).at(-1) ?? '')?.[1];
  if (!code) {
    throw new Error(`The mail to ${email} carried no six-digit code.`);
  }
  return code;
}

export async function signInWithCode({ page, email }: { page: Page; email: string }) {
  await page.goto('/sign-in');
  const code = await requestSignInCode({ page, email });
  await page.getByLabel('Sign-in code').fill(code);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

/** Runs `scripts/create-client.mts` against the E2E database, as an operator would. */
export function createTrustedClient({
  name,
  redirectUri,
  ownerEmail,
}: {
  name: string;
  redirectUri: string;
  ownerEmail: string;
}): string {
  const databaseUrl = e2eDatabaseUrl();
  const output = execFileSync(
    'npx',
    [
      'tsx',
      'scripts/create-client.mts',
      '--name',
      name,
      '--redirect-uri',
      redirectUri,
      '--owner',
      ownerEmail,
    ],
    {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        DATABASE_URL_UNPOOLED: databaseUrl,
        BETTER_AUTH_SECRET: E2E_AUTH_SECRET,
        BETTER_AUTH_URL: E2E_ORIGIN,
      },
      encoding: 'utf8',
    },
  );
  const clientId = /^ACCOUNTS_CLIENT_ID=(.+)$/m.exec(output)?.[1];
  if (!clientId) {
    throw new Error(`create-client printed no client id:\n${output}`);
  }
  return clientId;
}

function mailsTo(email: string): string[] {
  if (!existsSync(E2E_MAIL_OUTBOX)) {
    return [];
  }
  return readFileSync(E2E_MAIL_OUTBOX, 'utf8')
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => outboxLineSchema.parse(JSON.parse(line)))
    .filter((mail) => mail.to === email)
    .map((mail) => mail.text);
}
