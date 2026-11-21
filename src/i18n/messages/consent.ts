import type { Messages } from '@yaniv120892/my-ui';

export const consentEn = {
  'consent.title': 'Allow access?',
  'consent.intro': '{client} wants to sign you in with your My account and see:',
  'consent.unknownClient': 'An app',
  'consent.scope.openid': 'That it is you',
  'consent.scope.profile': 'Your name and picture',
  'consent.scope.email': 'Your email address',
  'consent.scope.offline_access': 'Stay signed in when you are away',
  'consent.allow': 'Allow',
  'consent.deny': 'Deny',
  'consent.failed': 'That didn’t go through. Go back to the app and sign in again.',
} satisfies Messages;

export const consentHe: Record<keyof typeof consentEn, string> = {
  'consent.title': 'לאשר גישה?',
  'consent.intro': '{client} רוצה להכניס אתכם עם חשבון My שלכם ולראות:',
  'consent.unknownClient': 'אפליקציה',
  'consent.scope.openid': 'שזה אתם',
  'consent.scope.profile': 'השם והתמונה שלכם',
  'consent.scope.email': 'כתובת האימייל שלכם',
  'consent.scope.offline_access': 'להישאר מחוברים גם כשאתם לא בה',
  'consent.allow': 'אישור',
  'consent.deny': 'סירוב',
  'consent.failed': 'זה לא הצליח. חזרו לאפליקציה והיכנסו שוב.',
};
