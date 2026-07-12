import { describe, it, expect } from 'vitest';
import { applyTheme, isValidToken } from '../src/lib/theme.js';

describe('theme', () => {
  it('isValidToken accepts CSS-ish values, rejects braces/empty/overlong', () => {
    expect(isValidToken('#eee')).toBe(true);
    expect(isValidToken('blue')).toBe(true);
    expect(isValidToken('monospace')).toBe(true);
    expect(isValidToken('')).toBe(false);
    expect(isValidToken('red}<script>')).toBe(false);
    expect(isValidToken('a'.repeat(80))).toBe(false);
    expect(isValidToken(42)).toBe(false);
  });

  it('maps unprefixed config keys to --an-* vars, keeping only valid ones', () => {
    const root = document.createElement('div');
    applyTheme({ 'panel-bg': '#000', border: 'red', 'shadow-1': 'bad;val' }, root);
    expect(root.style.getPropertyValue('--an-panel-bg')).toBe('#000');
    expect(root.style.getPropertyValue('--an-border')).toBe('red');
    expect(root.style.getPropertyValue('--an-shadow-1')).toBe(''); // rejected (;)
  });

  it('no-ops on a missing theme (defaults from global.css stand)', () => {
    const root = document.createElement('div');
    applyTheme(null, root);
    applyTheme(undefined, root);
    expect(root.style.getPropertyValue('--an-panel-bg')).toBe('');
  });
});
