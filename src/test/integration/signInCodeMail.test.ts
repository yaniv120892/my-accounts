import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logger, observability } from '@/lib/observability';
import {
  SIGN_IN_MAIL_ADDRESS_DAILY_LIMIT,
  admitSignInCodeMail,
  sendSignInCodeMail,
} from '@/services/signInCodeMail';

import { fakeCounterStore, offlineNetwork } from './helpers/network';

const smtpSend = vi.hoisted(() => vi.fn());

vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail: smtpSend }) },
}));

const EMAIL = 'dana@example.com';
const ENGLISH = { url: 'https://accounts.test/sign-in', headers: new Headers() };
const HEBREW = {
  url: 'https://accounts.test/sign-in',
  headers: new Headers({ 'accept-language': 'he-IL,he;q=0.9' }),
};

beforeEach(() => {
  smtpSend.mockReset();
  vi.stubEnv('SMTP_USER', 'accounts@example.com');
  vi.stubEnv('SMTP_PASSWORD', 'app-password');
});

describe('sendSignInCodeMail', () => {
  it('mails the code in the person’s language', async () => {
    await sendSignInCodeMail({ email: EMAIL, code: '482913', request: HEBREW });

    expect(smtpSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: EMAIL,
        from: 'accounts@example.com',
        subject: expect.stringContaining('482913'),
        text: expect.stringContaining('הקלידו'),
      }),
    );
  });

  it('swallows a mail server failure and alerts it, by its codes, never the address', async () => {
    const error = vi.spyOn(logger, 'error');
    const alert = vi.spyOn(observability, 'scheduleOpsAlert');
    smtpSend.mockRejectedValue(
      Object.assign(new Error(`550 <${EMAIL}> rejected`), { responseCode: 550 }),
    );

    await expect(
      sendSignInCodeMail({ email: EMAIL, code: '482913', request: ENGLISH }),
    ).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ smtpResponseCode: 550 }),
      'sign_in_mail_failed',
    );
    expect(alert).toHaveBeenCalledWith(
      expect.objectContaining({ alertType: 'sign_in_mail_failed' }),
    );
    const alerted = alert.mock.calls[0]?.[0].error;
    expect(alerted instanceof Error ? alerted.message : alerted).toContain('550');
    expect(JSON.stringify([error.mock.calls, String(alerted)])).not.toContain(EMAIL);
  });
});

describe('admitSignInCodeMail', () => {
  it(`admits ${SIGN_IN_MAIL_ADDRESS_DAILY_LIMIT} mails a day to one address`, async () => {
    const decisions: boolean[] = [];
    for (let mail = 0; mail <= SIGN_IN_MAIL_ADDRESS_DAILY_LIMIT; mail++) {
      decisions.push(await admitSignInCodeMail(EMAIL));
    }

    expect(decisions.filter(Boolean)).toHaveLength(SIGN_IN_MAIL_ADDRESS_DAILY_LIMIT);
    expect(decisions.at(-1)).toBe(false);
  });

  it('counts under its own name in the counter store the suite apps share', async () => {
    await admitSignInCodeMail(EMAIL);

    const countedKeys = offlineNetwork.mock.calls.map(([, init]) => String(init?.body));
    expect(countedKeys.length).toBeGreaterThan(0);
    for (const body of countedKeys) {
      expect(body).toContain('"accounts_sign_in_mail_budget:');
    }
  });

  it('admits nothing while the counter store is down', async () => {
    const warn = vi.spyOn(logger, 'warn');
    fakeCounterStore.goDown();

    expect(await admitSignInCodeMail(EMAIL)).toBe(false);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'storeUnavailable' }),
      'sign_in_mail_refused',
    );
  });
});
