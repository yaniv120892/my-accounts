import type { DailyBudget } from '@yaniv120892/app-kit/daily-budget';
import { formatMessage, type Locale } from '@yaniv120892/my-ui';
import { localeDirection, requestLocale } from '@yaniv120892/my-ui/server';

import { sendMail } from '@/clients/mailerClient';
import type { OutgoingMail } from '@/clients/mailerClient.types';
import { emailMessages } from '@/i18n/messages/email';
import type { SignInCode } from '@/lib/createAuth.types';
import { dailyBudget } from '@/lib/guards';
import { hashForLog, mailErrorFields } from '@/lib/logFields';
import type { MailErrorFields } from '@/lib/logFields.types';
import { logger, reportAndAlert } from '@/lib/observability';
import { positiveIntegerEnv } from '@/lib/positiveIntegerEnv';
import { SIGN_IN_CODE_TTL_SECONDS } from '@/lib/signInCode';

export const SIGN_IN_MAIL_ADDRESS_DAILY_LIMIT = 20;
export const DEFAULT_SIGN_IN_MAIL_GLOBAL_DAILY_LIMIT = 300;
const SIGN_IN_MAIL_GLOBAL_DAILY_LIMIT_ENV = 'SIGN_IN_MAIL_GLOBAL_DAILY_LIMIT';

type SignInCodeMail = { email: string; code: string; locale: Locale };

/**
 * Decides, before Better Auth stores a new code, whether this address may be mailed one. Asking
 * afterwards would replace the code the person already has with one nobody receives.
 *
 * The mail account has a daily sending quota shared by every sign-in, so each mail spends the
 * app's daily budget (and the address's) first. A refusal answers the same "sent" as a success,
 * so it says nothing about the address.
 */
export async function admitSignInCodeMail(email: string): Promise<boolean> {
  const emailHash = hashForLog(email);
  try {
    const decision = await dailyBudget.reserve({
      budget: signInMailBudget(),
      subjectId: `email:${emailHash}`,
    });
    if (!decision.isAllowed) {
      logger.warn({ emailHash, reason: decision.reason }, 'sign_in_mail_refused');
    }
    return decision.isAllowed;
  } catch (error) {
    reportAndAlert({
      error,
      where: 'sign_in_mail_budget',
      alertType: 'sign_in_mail_budget_failed',
      alertTitle: 'Sign-in mail budget check failed: no codes are going out',
    });
    return false;
  }
}

/**
 * Runs after the request has answered (Better Auth hands it to `waitUntil`), so it never rejects:
 * an unhandled rejection would only crash the function. A failure is alerted, since the person
 * was already told the code is on its way and nobody can sign in until it is fixed.
 */
export async function sendSignInCodeMail({ email, code, request }: SignInCode): Promise<void> {
  const emailHash = hashForLog(email);
  try {
    await sendMail(buildSignInCodeMail({ email, code, locale: requestLocale(request) }));
    logger.info({ emailHash, ship: true }, 'sign_in_mail_sent');
  } catch (error) {
    const fields = mailErrorFields(error);
    logger.error({ emailHash, ...fields }, 'sign_in_mail_failed');
    reportAndAlert({
      // A mail server's message can quote the recipient, so only its codes travel.
      error: new SignInMailFailedError(fields),
      where: 'sign_in_mail',
      alertType: 'sign_in_mail_failed',
      alertTitle: 'Sign-in code mail failed',
    });
  }
}

export function buildSignInCodeMail({ email, code, locale }: SignInCodeMail): OutgoingMail {
  const text = emailMessages[locale];
  const minutes = String(SIGN_IN_CODE_TTL_SECONDS / 60);

  return {
    to: email,
    subject: formatMessage({ template: text['email.subject'], variables: { code } }),
    text: formatMessage({ template: text['email.text'], variables: { code, minutes } }),
    html:
      `<div dir="${localeDirection(locale)}" style="font-family:sans-serif">` +
      `<p>${text['email.htmlIntro']}</p>` +
      `<p style="font-size:28px;font-weight:bold;letter-spacing:6px" dir="ltr">${code}</p>` +
      `<p style="color:#666">${formatMessage({ template: text['email.htmlFooter'], variables: { minutes } })}</p>` +
      `</div>`,
  };
}

function signInMailBudget(): DailyBudget {
  return {
    feature: 'sign_in_mail',
    subjectLimit: SIGN_IN_MAIL_ADDRESS_DAILY_LIMIT,
    globalLimit: positiveIntegerEnv({
      name: SIGN_IN_MAIL_GLOBAL_DAILY_LIMIT_ENV,
      fallback: DEFAULT_SIGN_IN_MAIL_GLOBAL_DAILY_LIMIT,
    }),
  };
}

class SignInMailFailedError extends Error {
  public constructor({ errorName, errorCode, smtpResponseCode }: MailErrorFields) {
    super(
      `Sign-in mail failed (errorName: ${errorName}, errorCode: ${errorCode}, smtpResponseCode: ${smtpResponseCode})`,
    );
    this.name = 'SignInMailFailedError';
  }
}
