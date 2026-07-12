import { describe, it, expect } from 'vitest';
import { decodeBlurhash } from '../src/lib/blurhash.js';

// A real blurhash from the reference test vectors (a mostly warm image).
const HASH = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';

describe('decodeBlurhash', () => {
  it('decodes to an RGBA buffer of the requested size', () => {
    const px = decodeBlurhash(HASH, 8, 6);
    expect(px).toBeInstanceOf(Uint8ClampedArray);
    expect(px.length).toBe(8 * 6 * 4);
    expect([...px].every((v) => v >= 0 && v <= 255)).toBe(true);
    // alpha is fully opaque
    for (let i = 3; i < px.length; i += 4) expect(px[i]).toBe(255);
  });

  it('a flat single-component hash decodes to a near-uniform field', () => {
    // '00' size flag → 1×1 components → the DC term paints one solid colour.
    const flat = decodeBlurhash('00' + 'PPPP', 4, 4); // AAAA-ish DC, no AC terms
    expect(flat).not.toBeNull();
    const [r0, g0, b0] = [flat[0], flat[1], flat[2]];
    for (let i = 0; i < flat.length; i += 4) {
      expect(flat[i]).toBe(r0);
      expect(flat[i + 1]).toBe(g0);
      expect(flat[i + 2]).toBe(b0);
    }
  });

  it('rejects malformed input', () => {
    expect(decodeBlurhash('', 4, 4)).toBeNull();
    expect(decodeBlurhash('abc', 4, 4)).toBeNull();
    expect(decodeBlurhash(null, 4, 4)).toBeNull();
    expect(decodeBlurhash(HASH + 'x', 4, 4)).toBeNull(); // wrong length for its size flag
  });
});
