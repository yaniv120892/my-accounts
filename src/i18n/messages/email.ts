import type { Dictionary, Messages } from '@yaniv120892/my-ui';

/** The sign-in email. Server-only, so it lives outside the dictionary that is shipped to the browser. */
const emailEn = {
  'email.subject': 'Your My account sign-in code: {code}',
  'email.text':
    'Your sign-in code: {code}\nType it on the page where you asked to sign in.\n\nThe code is valid for {minutes} minutes and can be used once. If you didn’t ask to sign in, you can ignore this message.',
  'email.htmlIntro': 'Type this code on the page where you asked to sign in:',
  'email.htmlFooter':
    'The code is valid for {minutes} minutes and can be used once. If you didn’t ask to sign in, you can ignore this message.',
} satisfies Messages;

export type EmailMessages = typeof emailEn;

export const emailMessages: Dictionary<EmailMessages> = {
  en: emailEn,
  he: {
    'email.subject': 'קוד הכניסה לחשבון My שלך: {code}',
    'email.text':
      'קוד הכניסה שלך: {code}\nהקלידו אותו בעמוד שבו ביקשתם להיכנס.\n\nהקוד תקף ל-{minutes} דקות ולשימוש אחד. אם לא ביקשתם להיכנס, אפשר להתעלם מההודעה.',
    'email.htmlIntro': 'הקלידו את הקוד בעמוד שבו ביקשתם להיכנס:',
    'email.htmlFooter':
      'הקוד תקף ל-{minutes} דקות ולשימוש אחד. אם לא ביקשתם להיכנס, אפשר להתעלם מההודעה.',
  },
};
