import type { Messages } from '@yaniv120892/my-ui';

export const appEn = {
  'app.name': 'My account',
  'meta.description': 'One account for My Expenses, My Investments, My Shopping and My Parking.',
} satisfies Messages;

export const appHe: Record<keyof typeof appEn, string> = {
  'app.name': 'החשבון שלי',
  'meta.description': 'חשבון אחד להוצאות שלי, להשקעות שלי, לקניות שלי ולחניה שלי.',
};
