import { describe, it, expect } from 'vitest';
import { Nav } from '../src/lib/nav.svelte.js';

const META = {
  a: { slug: 'a', title: 'Alpha', description: 'desc-a', counts: { contents: 3 } },
  b: { slug: 'b', title: 'Beta', description: 'desc-b', counts: { contents: 1 } },
  sub: { slug: 'sub', title: 'Sub', description: '', counts: { contents: 1 } },
};
const CONTENTS = {
  a: {
    1: {
      blocks: [
        { id: 10, kind: 'text', title: 'T', html: '<p>t</p>' },
        { id: 11, kind: 'image', title: 'I', image: { src: 'x.jpg' } },
        { id: 12, kind: 'channel', title: 'Sub', channelSlug: 'sub', count: 5 },
      ],
      hasMore: true,
    },
    2: { blocks: [{ id: 13, kind: 'image', title: 'I2', image: { src: 'y.jpg' } }], hasMore: false },
  },
  b: { 1: { blocks: [{ id: 20, kind: 'link', title: 'L', link: { url: 'https://www.nytimes.com/x' } }], hasMore: false } },
  sub: { 1: { blocks: [{ id: 30, kind: 'image', title: 'S', image: { src: 's.jpg' } }], hasMore: false } },
};

function makeArena(connections = []) {
  return {
    getChannelMeta: async (slug) => {
      if (slug === 'dead') throw new Error('404');
      return META[slug] || { slug, title: slug, description: '', counts: null };
    },
    getContentsPage: async (slug, page = 1) =>
      CONTENTS[slug]?.[page] || { blocks: [], hasMore: false, nextPage: null },
    getConnections: async () => ({ channels: connections }),
  };
}

const nav = (arena, config = { title: 'Site', channels: ['a', 'b'] }) => new Nav({ arena, config });

describe('Nav', () => {
  it('loadRoot lists sections and flags a dead one', async () => {
    const n = nav(makeArena(), { title: 'Site', channels: ['a', 'dead'] });
    await n.loadRoot();
    expect(n.sections.map((s) => s.title)).toEqual(['Alpha', 'dead']);
    expect(n.sections[1].dead).toBe(true);
    expect(n.atRoot).toBe(true);
  });

  it('enter drills and loads blocks; breadcrumb grows', async () => {
    const n = nav(makeArena());
    await n.loadRoot();
    await n.enter('a');
    expect(n.path.map((p) => p.slug)).toEqual(['a']);
    expect(n.blocks).toHaveLength(3);
    expect(n.breadcrumb.map((c) => c.title)).toEqual(['Site', 'Alpha']);
    expect(n.about).toBe('desc-a');
  });

  it('cycle guard refuses a channel already on the path', async () => {
    const n = nav(makeArena());
    await n.enter('a');
    await n.enter('a');
    expect(n.path).toHaveLength(1);
  });

  it('depth cap stops at 8', async () => {
    const n = nav(makeArena());
    for (let i = 0; i < 9; i++) await n.enter(`c${i}`);
    expect(n.path).toHaveLength(8);
  });

  it('pop truncates the path', async () => {
    const n = nav(makeArena());
    await n.enter('a');
    await n.enter('sub');
    expect(n.path).toHaveLength(2);
    await n.pop(1);
    expect(n.path.map((p) => p.slug)).toEqual(['a']);
  });

  it('jump reroots the breadcrumb (fresh, not appended)', async () => {
    const n = nav(makeArena());
    await n.enter('a');
    await n.jump('b');
    expect(n.path.map((p) => p.slug)).toEqual(['b']);
    expect(n.connectionMode).toBe(true);
  });

  it('connections hide channels already on the path', async () => {
    const n = nav(makeArena([{ slug: 'a', title: 'A' }, { slug: 'x', title: 'X' }]));
    await n.enter('a');
    expect(n.connections.map((c) => c.slug)).toEqual(['x']);
  });

  it('lazy pagination appends page 2 on loadMore', async () => {
    const n = nav(makeArena());
    await n.enter('a');
    expect(n.blocks).toHaveLength(3);
    expect(n.hasMore).toBe(true);
    await n.loadMore();
    expect(n.blocks).toHaveLength(4);
    expect(n.hasMore).toBe(false);
  });

  it('surfaces a rate-limited error distinctly from unreachable', async () => {
    const arena = makeArena();
    arena.getChannelMeta = async () => {
      const e = new Error('rl');
      e.rateLimited = true;
      throw e;
    };
    const n = nav(arena, { title: 'S', channels: ['a'] });
    await n.enter('a');
    expect(n.error).toMatch(/slow down/i);
  });

  it('landing prefers an Image; a denylisted-links-only channel shows the index', async () => {
    const n = nav(makeArena());
    await n.enter('a');
    expect(n.landing()?.id).toBe(11); // the Image
    await n.jump('b');
    expect(n.landing()).toBeNull(); // only a denylisted Link → no auto-open
    expect(n.active).toBeNull();
  });

  it('sanitizes a channel description before it can reach {@html} (ISSUES I1)', async () => {
    const arena = makeArena();
    arena.getChannelMeta = async (slug) => ({
      slug,
      title: 'M',
      description: '<img src=x onerror="alert(1)"><script>alert(2)</script><p>ok</p>',
      counts: null,
    });
    const n = nav(arena, { title: 'S', channels: ['m'] });
    await n.enter('m');
    // about feeds both {@html} sinks (Panel + Cover) via App.svelte — the getter is
    // the one canonical sanitized path, so remote HTML never reaches a sink raw.
    expect(n.about).not.toMatch(/onerror/i);
    expect(n.about).not.toMatch(/<script/i);
    expect(n.about).toContain('ok');
  });
});
