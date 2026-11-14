import type { Messages } from '@yaniv120892/my-ui';

export const homeEn = {
  'home.title': 'Your account',
  'home.signedInAs': 'Signed in as {email}',
  'home.signOut': 'Sign out',
  'home.signingOut': 'Signing out…',
} satisfies Messages;

export const homeHe: Record<keyof typeof homeEn, string> = {
  'home.title': 'החשבון שלך',
  'home.signedInAs': 'מחוברים בתור {email}',
  'home.signOut': 'יציאה',
  'home.signingOut': 'יוצאים…',
};
