import { appendFileSync } from 'node:fs';

import type { Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';

import { hashForLog } from '@/lib/logFields';
import { logger } from '@/lib/observability';

import type { OutgoingMail } from './mailerClient.types';

const SMTP_TIMEOUT_MS = 10_000;
const DEFAULT_SMTP_HOST = 'smtp.gmail.com';
const DEFAULT_SMTP_PORT = 465;

let cachedTransporter: Transporter | null = null;

export class MailNotConfiguredError extends Error {
  public constructor() {
    super('Email sign-in is not configured on this server (SMTP_USER / SMTP_PASSWORD are unset).');
    this.name = 'MailNotConfiguredError';
  }
}

/**
 * Without SMTP credentials a development server prints the message instead, so email sign-in
 * works locally with nothing configured. Anywhere else the printed code would be a live sign-in
 * secret in shipped logs, so it throws and logs at error: a code that silently goes nowhere
 * otherwise looks exactly like a slow inbox to everyone, operators included.
 */
export async function sendMail(mail: OutgoingMail): Promise<void> {
  const transporter = getTransporter();

  if (!transporter) {
    if (process.env.NODE_ENV !== 'development') {
      logger.error(
        { recipientHash: hashForLog(mail.to), subject: mail.subject },
        'smtp_not_configured',
      );
      throw new MailNotConfiguredError();
    }
    printForDevelopment(mail);
    return;
  }

  await transporter.sendMail({ from: process.env.SMTP_USER, ...mail });
}

/**
 * The console for a person, and `DEV_MAIL_OUTBOX` (a file, one JSON mail per line) for the
 * browser specs, which cannot read the dev server's console. Reached only on `next dev`.
 */
function printForDevelopment(mail: OutgoingMail): void {
  logger.info(
    { recipientHash: hashForLog(mail.to), subject: mail.subject, text: mail.text },
    'mail_printed_not_sent',
  );
  const outbox = process.env.DEV_MAIL_OUTBOX;
  if (outbox) {
    appendFileSync(outbox, `${JSON.stringify({ to: mail.to, text: mail.text })}\n`);
  }
}

function getTransporter(): Transporter | null {
  const user = process.env.SMTP_USER ?? '';
  const password = process.env.SMTP_PASSWORD ?? '';
  const hasCredentials = user.length > 0 && password.length > 0;
  if (!hasCredentials) {
    return null;
  }

  if (!cachedTransporter) {
    const port = Number(process.env.SMTP_PORT || DEFAULT_SMTP_PORT);
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || DEFAULT_SMTP_HOST,
      port,
      // Port 465 speaks TLS from the first byte; 587 upgrades with STARTTLS.
      secure: port === 465,
      auth: { user, pass: password },
      connectionTimeout: SMTP_TIMEOUT_MS,
      greetingTimeout: SMTP_TIMEOUT_MS,
      socketTimeout: SMTP_TIMEOUT_MS,
    });
  }

  return cachedTransporter;
}
