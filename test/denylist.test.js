import { describe, it, expect } from 'vitest';
import { isDenylisted } from '../src/lib/denylist.js';

describe('isDenylisted (registrable-domain match)', () => {
  it('flags known refusers', () => {
    expect(isDenylisted('https://www.nytimes.com/2020/article')).toBe(true);
    expect(isDenylisted('https://github.com/user/repo')).toBe(true);
    expect(isDenylisted('https://x.com/status/1')).toBe(true);
  });

  it('flags subdomains of a refuser (per-user hosts like *.wordpress.com)', () => {
    expect(isDenylisted('https://moultano.wordpress.com/post')).toBe(true);
    expect(isDenylisted('https://sub.nytimes.com/x')).toBe(true);
    expect(isDenylisted('https://someone.substack.com/p/x')).toBe(true);
  });

  it('allows hosts not on the list', () => {
    expect(isDenylisted('https://example.com/page')).toBe(false);
    expect(isDenylisted('https://dirtylittlezine.com/')).toBe(false);
    // a domain that merely ends with a listed one but isn't a subdomain
    expect(isDenylisted('https://notx.com/a')).toBe(false);
  });

  it('is safe on empty / malformed input', () => {
    expect(isDenylisted('')).toBe(false);
    expect(isDenylisted('not a url')).toBe(false);
  });
});
