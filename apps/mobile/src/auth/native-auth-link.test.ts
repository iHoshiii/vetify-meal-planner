import { describe, expect, it } from 'vitest';
import { parseMainAccountLink } from './native-auth-link';

describe('main account connection links', () => {
  it('accepts the registered callback with one opaque handoff code', () => {
    expect(parseMainAccountLink('vetify-planner://auth/callback?code=one-use_code')).toBe(
      'one-use_code',
    );
  });

  it.each([
    null,
    '',
    'not a URL',
    'https://auth/callback?code=valid-code',
    'vetify-planner://other/callback?code=valid-code',
    'vetify-planner://auth:123/callback?code=valid-code',
    'vetify-planner://auth/other?code=valid-code',
    'vetify-planner://user:pass@auth/callback?code=valid-code',
    'vetify-planner://auth/callback',
    'vetify-planner://auth/callback?code=',
    'vetify-planner://auth/callback?code=one&code=two',
    'vetify-planner://auth/callback?code=valid-code&accessToken=secret',
    'vetify-planner://auth/callback?code=valid-code&userId=someone',
    'vetify-planner://auth/callback?code=valid-code#refreshToken=secret',
    'vetify-planner://auth/callback?code=invalid%20code',
    `vetify-planner://auth/callback?code=${'x'.repeat(129)}`,
  ])('ignores an untrusted or malformed link: %s', (url) => {
    expect(parseMainAccountLink(url)).toBeNull();
  });
});
