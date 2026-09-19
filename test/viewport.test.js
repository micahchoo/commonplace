import { describe, it, expect, afterEach } from 'vitest';
import { MOBILE_QUERY, isMobile, watchMobile } from '../src/lib/viewport.js';

// jsdom defines no matchMedia, so desktop is the default and mobile is opted into.
function stub(matches) {
  const listeners = new Set();
  window.matchMedia = (q) => ({
    matches,
    media: q,
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
  });
  return listeners;
}

describe('viewport', () => {
  afterEach(() => {
    delete window.matchMedia;
  });

  it('reads the one breakpoint, and says desktop when there is no matchMedia', () => {
    expect(MOBILE_QUERY).toBe('(max-width: 768px)');
    expect(isMobile()).toBe(false); // no matchMedia — never throws, never guesses mobile
    stub(true);
    expect(isMobile()).toBe(true);
  });

  it('watchMobile reports the current state at once, then on every crossing', () => {
    const listeners = stub(true);
    const seen = [];
    const off = watchMobile((m) => seen.push(m));
    expect(seen).toEqual([true]); // fires immediately: a caller never waits for a resize
    listeners.forEach((fn) => fn());
    expect(seen).toEqual([true, true]);
    off();
    expect(listeners.size).toBe(0); // teardown unsubscribes
  });

  it('watchMobile without matchMedia is inert and still returns a teardown', () => {
    const off = watchMobile(() => {
      throw new Error('must not fire');
    });
    expect(() => off()).not.toThrow();
  });
});
