import type { AppMessageKey } from '@/i18n/messages';

const SCOPE_MESSAGE_KEYS = {
  openid: 'consent.scope.openid',
  profile: 'consent.scope.profile',
  email: 'consent.scope.email',
  offline_access: 'consent.scope.offline_access',
} satisfies Record<string, AppMessageKey>;

type KnownScope = keyof typeof SCOPE_MESSAGE_KEYS;

/** What the consent page lists for a requested `scope` string; a scope it cannot describe is left out. */
export function consentScopeMessageKeys(scope: string | undefined): AppMessageKey[] {
  return (scope ?? '')
    .split(' ')
    .filter(isKnownScope)
    .map((known) => SCOPE_MESSAGE_KEYS[known]);
}

function isKnownScope(scope: string): scope is KnownScope {
  return Object.hasOwn(SCOPE_MESSAGE_KEYS, scope);
}
