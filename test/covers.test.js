import { describe, it, expect } from 'vitest';
import { collectThumbnails } from '../src/lib/covers.js';

const arena = {
  getContentsPage: async (slug) => {
    if (slug === 'dead') throw new Error('404');
    if (slug === 'a')
      return {
        blocks: [
          { id: 1, title: 'i', image: { thumb: 'a1.jpg', src: 'a1-l.jpg' } },
          { id: 2, title: 'txt' }, // no image -> excluded
          { id: 3, title: 'lnk', image: { src: 'a3.jpg' } }, // src-only fallback
        ],
      };
    if (slug === 'b') return { blocks: [{ id: 4, title: 'i2', image: { thumb: 'b4.jpg' } }] };
    return { blocks: [] };
  },
};

describe('collectThumbnails', () => {
  it('collects image-bearing blocks across channels, tagged with slug', async () => {
    const t = await collectThumbnails(arena, ['a', 'b']);
    expect(t.map((x) => x.id)).toEqual([1, 3, 4]);
    expect(t[0]).toEqual({ id: 1, slug: 'a', thumb: 'a1.jpg', title: 'i' });
    expect(t[1].thumb).toBe('a3.jpg'); // falls back to image.src
    expect(t[2].slug).toBe('b');
  });

  it('skips dead channels without throwing', async () => {
    const t = await collectThumbnails(arena, ['a', 'dead', 'b']);
    expect(t.map((x) => x.slug)).toEqual(['a', 'a', 'b']);
  });

  it('empty slug list -> empty montage', async () => {
    expect(await collectThumbnails(arena, [])).toEqual([]);
  });
});
