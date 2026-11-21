import { commonMessages } from '@yaniv120892/my-ui';
import { describe, expect, it } from 'vitest';

import { MESSAGE_AREAS, messages } from '@/i18n/messages';
import { emailMessages } from '@/i18n/messages/email';

const PLACEHOLDER = /\{(\w+)\}/g;

function placeholdersOf(template: string): string[] {
  return Array.from(template.matchAll(PLACEHOLDER), (match) => match[1] ?? '').sort();
}

function expectParity({
  en,
  he,
}: {
  en: Record<string, string>;
  he: Record<string, string>;
}): void {
  expect(Object.keys(he).sort()).toEqual(Object.keys(en).sort());
  for (const key of Object.keys(en)) {
    expect(he[key]?.trim(), `he '${key}' is empty`).toBeTruthy();
    expect(en[key]?.trim(), `en '${key}' is empty`).toBeTruthy();
    expect(placeholdersOf(he[key] ?? ''), `placeholders of '${key}'`).toEqual(
      placeholdersOf(en[key] ?? ''),
    );
  }
}

describe('messages', () => {
  it('has the same keys and placeholders in Hebrew and English', () => {
    expectParity({ en: messages.en, he: messages.he });
  });

  it.each(MESSAGE_AREAS.map((area) => [area.name, area] as const))(
    "keeps the %s area's Hebrew in step with its English",
    (_name, area) => {
      expectParity({ en: area.en, he: area.he });
    },
  );

  it('never defines one key in two areas, where the later spread would silently win', () => {
    const keys = MESSAGE_AREAS.flatMap((area) => Object.keys(area.en));
    expect(keys.length).toBe(new Set(keys).size);
    expect(Object.keys(messages.en)).toHaveLength(keys.length);
  });

  it("does not shadow the shared shell's keys", () => {
    const shared = new Set(Object.keys(commonMessages.en));
    expect(Object.keys(messages.en).filter((key) => shared.has(key))).toEqual([]);
  });

  it('keeps the server-only email messages in step too', () => {
    expectParity({ en: emailMessages.en, he: emailMessages.he });
  });
});
