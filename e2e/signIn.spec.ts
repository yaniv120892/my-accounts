import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';

import { E2E_ORIGIN } from './support/e2eEnvironment';
import { createTrustedClient, requestSignInCode, signInWithCode } from './support/signIn';
import { wrongCodeFor } from '../src/test/helpers/wrongCode';

/** A suite app's callback; nothing listens there, so each spec answers it itself. */
const CLIENT_CALLBACK = 'http://127.0.0.1:3299/api/auth/accounts/callback';

test.describe('signing in with an emailed code', () => {
  test('email, then the code, signs in and shows the account', async ({ page }) => {
    await signInWithCode({ page, email: 'direct@e2e.test' });

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('direct@e2e.test')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  test('the code step survives a reload', async ({ page }) => {
    await page.goto('/sign-in');
    const code = await requestSignInCode({ page, email: 'reload@e2e.test' });

    await page.reload();
    // Pasted from the mail with a space, as a phone's copy often gives it.
    await page.getByLabel('Sign-in code').fill(`${code.slice(0, 3)} ${code.slice(3)}`);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('reload@e2e.test')).toBeVisible();
  });

  test('a wrong code keeps the form and says so', async ({ page }) => {
    await page.goto('/sign-in');
    const code = await requestSignInCode({ page, email: 'wrong@e2e.test' });

    await page.getByLabel('Sign-in code').fill(wrongCodeFor(code));
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page.getByText('That code is wrong or expired')).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('signing out returns to the sign-in page', async ({ page }) => {
    await signInWithCode({ page, email: 'signout@e2e.test' });
    await page.getByRole('button', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/sign-in/);
    await page.goto('/');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('the Hebrew page reads right to left and fits a 400px phone', async ({ page, context }) => {
    await context.addCookies([{ name: 'locale', value: 'he', url: E2E_ORIGIN }]);
    await page.goto('/sign-in');

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { name: 'כניסה' })).toBeVisible();
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalScroll).toBe(false);
  });
});

test.describe('signing in to a suite app', () => {
  test('authorize sends a signed-out person to sign in, then back to the app with a code', async ({
    page,
  }) => {
    const ownerEmail = 'operator@e2e.test';
    await signInWithCode({ page, email: ownerEmail });
    await expect(page).toHaveURL(/\/$/);
    const clientId = createTrustedClient({
      name: 'Park (e2e)',
      redirectUri: CLIENT_CALLBACK,
      ownerEmail,
    });
    await page.context().clearCookies();
    await page.route(`${CLIENT_CALLBACK}**`, (route) => route.fulfill({ body: 'client app' }));

    const verifier = randomBytes(32).toString('base64url');
    const authorize = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: CLIENT_CALLBACK,
      scope: 'openid profile email',
      state: 'e2e-state',
      nonce: 'e2e-nonce',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    });
    await page.goto(`/api/auth/oauth2/authorize?${authorize}`);
    await expect(page).toHaveURL(/\/sign-in\?.*sig=/);

    const code = await requestSignInCode({ page, email: 'family@e2e.test' });
    await page.getByLabel('Sign-in code').fill(code);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await page.waitForURL(`${CLIENT_CALLBACK}**`);
    const landing = new URL(page.url());
    expect(landing.searchParams.get('code')).toBeTruthy();
    expect(landing.searchParams.get('state')).toBe('e2e-state');
  });
});
