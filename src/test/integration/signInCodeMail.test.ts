import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from '@/lib/observability';
import { SIGN_IN_MAIL_ADDRESS_DAILY_LIMIT, sendSignInCodeMail } from '@/services/signInCodeMail';

import { fakeCounterStore } from './helpers/network';

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

  it(`stops at ${SIGN_IN_MAIL_ADDRESS_DAILY_LIMIT} mails a day to one address`, async () => {
    for (let mail = 0; mail <= SIGN_IN_MAIL_ADDRESS_DAILY_LIMIT; mail++) {
      await sendSignInCodeMail({ email: EMAIL, code: '482913', request: ENGLISH });
    }

    expect(smtpSend).toHaveBeenCalledTimes(SIGN_IN_MAIL_ADDRESS_DAILY_LIMIT);
  });

  it('sends nothing while the counter store is down, and does not throw', async () => {
    const warn = vi.spyOn(logger, 'warn');
    fakeCounterStore.goDown();

    await expect(
      sendSignInCodeMail({ email: EMAIL, code: '482913', request: ENGLISH }),
    ).resolves.toBeUndefined();

    expect(smtpSend).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'storeUnavailable' }),
      'sign_in_mail_refused',
    );
  });

  it('swallows a mail server failure, logging its codes but never the address', async () => {
    const error = vi.spyOn(logger, 'error');
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
    expect(JSON.stringify(error.mock.calls)).not.toContain(EMAIL);
  });
});
