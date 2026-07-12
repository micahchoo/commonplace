import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../src/lib/sanitize.js';

describe('sanitizeHtml (Text allowlist)', () => {
  it('strips <script>', () => {
    const out = sanitizeHtml('<p>hi</p><script>alert(1)<\/script>');
    expect(out).toContain('<p>hi</p>');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
  });

  it('keeps safe inline markup', () => {
    const out = sanitizeHtml('<p>a <em>b</em> <a href="https://x.test">c</a></p>');
    expect(out).toContain('<em>b</em>');
    expect(out).toContain('href="https://x.test"');
  });

  it('is safe on empty input', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
  });
});
