import { describe, it, expect } from 'vitest';
import { isDenylisted } from '../src/lib/denylist.js';

describe('isDenylisted (full-hostname match)', () => {
  it('flags known refusers', () => {
    expect(isDenylisted('https://www.nytimes.com/2020/article')).toBe(true);
    expect(isDenylisted('https://github.com/user/repo')).toBe(true);
    expect(isDenylisted('https://x.com/status/1')).toBe(true);
  });

  it('allows framable hosts — docs.google.com is not google.com', () => {
    expect(isDenylisted('https://docs.google.com/document/d/abc')).toBe(false);
    expect(isDenylisted('https://example.com/page')).toBe(false);
    expect(isDenylisted('https://someblog.tumblr.com/post')).toBe(false);
  });

  it('matches the exact hostname, not a subdomain', () => {
    expect(isDenylisted('https://sub.nytimes.com/x')).toBe(false);
  });

  it('is safe on empty / malformed input', () => {
    expect(isDenylisted('')).toBe(false);
    expect(isDenylisted('not a url')).toBe(false);
  });
});
