import { describe, it, expect } from 'vitest';
import { encodePath, decodeHash, DEPTH_CAP } from '../src/lib/router.js';

describe('router encode/decode', () => {
  it('round-trips a path with a block id', () => {
    const hash = encodePath(['reading-room', 'field-notes'], 47749402);
    expect(hash).toBe('#reading-room/field-notes/b:47749402');
    expect(decodeHash(hash)).toEqual({ slugs: ['reading-room', 'field-notes'], blockId: 47749402 });
  });

  it('encodes a bare block id at root', () => {
    expect(encodePath([], 99)).toBe('#b:99');
    expect(decodeHash('#b:99')).toEqual({ slugs: [], blockId: 99 });
  });

  it('empty hash → empty result', () => {
    expect(decodeHash('')).toEqual({ slugs: [], blockId: null });
    expect(decodeHash('#')).toEqual({ slugs: [], blockId: null });
  });

  it('truncates beyond the depth cap', () => {
    const many = Array.from({ length: DEPTH_CAP + 4 }, (_, i) => `c${i}`);
    expect(decodeHash(encodePath(many)).slugs).toHaveLength(DEPTH_CAP);
  });

  it('round-trips slugs needing URL encoding', () => {
    const hash = encodePath(['a b', 'c/d']);
    expect(decodeHash(hash).slugs).toEqual(['a b', 'c/d']);
  });
});
