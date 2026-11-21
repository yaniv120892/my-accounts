import type { Messages } from '@yaniv120892/my-ui';

export const authEn = {
  'auth.signIn.title': 'Sign in',
  'auth.signIn.intro':
    'One account for every My app. No password needed: first time here? Signing in creates it.',
  'auth.google': 'Sign in with Google',
  'auth.or': 'or',
  'auth.email': 'Email',
  'auth.sendCode': 'Send sign-in code',
  'auth.sending': 'One moment…',
  'auth.sentTo': 'We sent a sign-in code to {email}. Type it here — it is valid for 10 minutes.',
  'auth.code': 'Sign-in code',
  'auth.signInWithCode': 'Sign in',
  'auth.signingIn': 'Signing in…',
  'auth.otherEmail': 'Use a different email',
  'auth.error.codeInvalid':
    'That code is wrong or expired. Check the latest email, or ask for a new code.',
  'auth.error.tooManyAttempts':
    'Too many wrong codes. Ask for a new code and use the latest email.',
  'auth.error.requestFailed': 'The code couldn’t be sent. Check the address and try again.',
  'auth.error.rateLimited':
    'Too many sign-in attempts from this network. Try again in a few minutes.',
  'auth.error.signInFailed': 'Signing in failed. Try again in a moment.',
  'auth.error.googleFailed': 'Signing in with Google didn’t finish. Try again.',
} satisfies Messages;

export const authHe: Record<keyof typeof authEn, string> = {
  'auth.signIn.title': 'כניסה',
  'auth.signIn.intro':
    'חשבון אחד לכל אפליקציות My. אין צורך בסיסמה: פעם ראשונה כאן? הכניסה יוצרת אותו.',
  'auth.google': 'כניסה עם Google',
  'auth.or': 'או',
  'auth.email': 'אימייל',
  'auth.sendCode': 'שליחת קוד כניסה',
  'auth.sending': 'רגע…',
  'auth.sentTo': 'שלחנו קוד כניסה אל {email}. הקלידו אותו כאן — הוא תקף ל-10 דקות.',
  'auth.code': 'קוד כניסה',
  'auth.signInWithCode': 'כניסה',
  'auth.signingIn': 'נכנסים…',
  'auth.otherEmail': 'שימוש באימייל אחר',
  'auth.error.codeInvalid': 'הקוד שגוי או שפג תוקפו. בדקו את המייל האחרון, או בקשו קוד חדש.',
  'auth.error.tooManyAttempts': 'יותר מדי קודים שגויים. בקשו קוד חדש והשתמשו במייל האחרון.',
  'auth.error.requestFailed': 'לא הצלחנו לשלוח את הקוד. בדקו את הכתובת ונסו שוב.',
  'auth.error.rateLimited': 'יותר מדי ניסיונות כניסה מהרשת הזו. נסו שוב בעוד כמה דקות.',
  'auth.error.signInFailed': 'הכניסה נכשלה. נסו שוב בעוד רגע.',
  'auth.error.googleFailed': 'הכניסה עם Google לא הושלמה. נסו שוב.',
};
