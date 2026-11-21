import { describe, expect, it } from 'vitest';

import { consentScopeMessageKeys } from '@/lib/consentScopes';

describe('consentScopeMessageKeys', () => {
  it('describes each known scope in the order requested', () => {
    expect(consentScopeMessageKeys('openid email profile')).toEqual([
      'consent.scope.openid',
      'consent.scope.email',
      'consent.scope.profile',
    ]);
  });

  it('leaves out what it cannot describe, including inherited object keys', () => {
    expect(consentScopeMessageKeys('openid toString admin')).toEqual(['consent.scope.openid']);
    expect(consentScopeMessageKeys(undefined)).toEqual([]);
  });
});
