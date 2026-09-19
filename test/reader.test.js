import { describe, it, expect, beforeEach } from 'vitest';
import { Nav } from '../src/lib/nav.svelte.js';
import { Reader } from '../src/lib/reader.svelte.js';

// The Reader is the seam between the hash and the drill tree, so these drive it
// the way the app does: a move writes the hash, `sync()` reads it back. Before the
// Reader existed this all lived in the shell and could only be reached by mounting
// the app into jsdom and dispatching DOM events.
//
// A local fake arena, deliberately not shared with nav.test.js: its channel 'a' is
// two pages deep with a drill node in the middle, which is what paging needs.
const META = {
  a: { slug: 'a', title: 'Alpha', description: '', counts: { contents: 4 } },
  b: { slug: 'b', title: 'Beta', description: '', counts: { contents: 1 } },
  sub: { slug: 'sub', title: 'Sub', description: '', counts: { contents: 1 } },
};
const CONTENTS = {
  a: {
    1: {
      blocks: [
        { id: 10, kind: 'text', title: 'T', html: '<p>t</p>' },
        { id: 11, kind: 'image', title: 'I', image: { src: 'x.jpg', thumb: 'x-s.jpg' } },
        { id: 12, kind: 'channel', title: 'Sub', channelSlug: 'sub', count: 5 },
      ],
      hasMore: true,
    },
    2: { blocks: [{ id: 13, kind: 'image', title: 'I2', image: { src: 'y.jpg' } }], hasMore: false },
  },
  b: { 1: { blocks: [{ id: 20, kind: 'image', title: 'B1', image: { src: 'b.jpg' } }], hasMore: false } },
  sub: { 1: { blocks: [{ id: 30, kind: 'image', title: 'S', image: { src: 's.jpg' } }], hasMore: false } },
};

function makeArena(delayMs = 0) {
  return {
    getChannelMeta: async (slug) => {
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      return META[slug] || { slug, title: slug, description: '', counts: null };
    },
    getContentsPage: async (slug, page = 1) =>
      CONTENTS[slug]?.[page] || { blocks: [], hasMore: false, nextPage: null },
    getConnections: async () => ({ channels: [] }),
  };
}

/** A reader over a two-section site, parked at the given hash. */
async function readerAt(hash, { delayMs = 0 } = {}) {
  const nav = new Nav({ arena: makeArena(delayMs), config: { title: 'Site', channels: ['a', 'b'] } });
  const reader = new Reader(nav);
  window.location.hash = hash;
  await reader.sync();
  return { nav, reader };
}

describe('Reader', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('sync enters the hash path and lands on a block that paints', async () => {
    const { nav } = await readerAt('#a');
    expect(nav.path.map((p) => p.slug)).toEqual(['a']);
    expect(nav.active?.id).toBe(11); // landing prefers the Image
  });

  it('select writes the block into the hash; a drill node writes a deeper path', async () => {
    const { nav, reader } = await readerAt('#a');
    reader.select(nav.blocks[0]);
    expect(window.location.hash).toBe('#a/b:10');

    reader.select(nav.blocks[2]); // the Channel entry
    expect(window.location.hash).toBe('#a/sub');
  });

  it('step walks the openable entries and skips the drill node', async () => {
    const { reader } = await readerAt('#a/b:10');
    await reader.step(1);
    expect(window.location.hash).toBe('#a/b:11');
    await reader.sync();
    await reader.step(1); // next openable is on page 2 — the drill node is not one
    expect(window.location.hash).toBe('#a/b:13');
  });

  it('step off the end of the loaded window pulls the next page', async () => {
    const { nav, reader } = await readerAt('#a/b:11');
    expect(nav.blocks).toHaveLength(3); // page 1 only
    await reader.step(1);
    expect(nav.blocks).toHaveLength(4); // page 2 fetched to satisfy the move
    expect(window.location.hash).toBe('#a/b:13');
  });

  it('step stops at both ends rather than wrapping', async () => {
    const { reader } = await readerAt('#a/b:10');
    await reader.step(-1);
    expect(window.location.hash).toBe('#a/b:10'); // already first — no move
    await readerAt('#b');
    const { reader: r2 } = await readerAt('#b/b:20');
    await r2.step(1);
    expect(window.location.hash).toBe('#b/b:20'); // only block, nothing more to load
  });

  it('a deep link past page 1 opens its block instead of a blank stage', async () => {
    const { nav } = await readerAt('#a/b:13');
    expect(nav.active?.id).toBe(13);
  });

  it('an unknown or unrenderable id falls back to the landing block', async () => {
    const { nav } = await readerAt('#a/b:999');
    expect(nav.active?.id).toBe(11); // never null, never a blank stage
    const { nav: n2 } = await readerAt('#a/b:12'); // a drill node is not stage content
    expect(n2.active?.id).toBe(11);
  });

  it('a superseded sync does not land its block over a newer one', async () => {
    const { reader, nav } = await readerAt('#a', { delayMs: 5 });
    window.location.hash = '#a/b:10';
    const stale = reader.sync();
    window.location.hash = '#b/b:20';
    const fresh = reader.sync();
    await Promise.all([stale, fresh]);
    expect(nav.active?.id).toBe(20); // the newer hash wins
  });

  it('cells cover every entry, not only the ones carrying an image', async () => {
    const { reader } = await readerAt('#a');
    expect(reader.cells.map((c) => c.id)).toEqual([10, 11, 12]);
    expect(reader.cells[0].thumb).toBe(''); // the Text tile has no image
    expect(reader.cells[1].thumb).toBe('x-s.jpg');
    expect(reader.cells[2].kind).toBe('channel'); // drills, not opens
    expect(reader.gridAvailable).toBe(true);
  });

  it('the sheet is per-channel: a drill puts it away', async () => {
    const { reader } = await readerAt('#a');
    reader.toggleGrid();
    expect(reader.gridMode).toBe(true);
    window.location.hash = '#a/sub';
    await reader.sync();
    expect(reader.gridMode).toBe(false);
  });

  it('escape leaves the sheet first, then backs out a level', async () => {
    const { reader } = await readerAt('#a/sub');
    reader.toggleGrid();
    reader.escape();
    expect(reader.gridMode).toBe(false);
    expect(window.location.hash).toBe('#a/sub'); // sheet only — the path has not moved
    reader.escape();
    expect(window.location.hash).toBe('#a');
  });

  it('openChannel adds a pasted channel as a session section and goes there', async () => {
    const { nav, reader } = await readerAt('');
    reader.openChannel('fresh-slug');
    expect(nav.config.channels).toEqual(['a', 'b', 'fresh-slug']);
    expect(window.location.hash).toBe('#fresh-slug');
  });

  it('openFromCover opens a block in the channel the cover cell names', async () => {
    const { reader } = await readerAt('');
    reader.openFromCover({ slug: 'b', id: 20 });
    expect(window.location.hash).toBe('#b/b:20');
  });
});
