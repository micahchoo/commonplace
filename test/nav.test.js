import { describe, it, expect, vi } from 'vitest';
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

  it('loadMore is guarded: a second call while one is in flight is dropped', async () => {
    const arena = makeArena();
    let calls = 0;
    const inner = arena.getContentsPage;
    arena.getContentsPage = async (slug, page) => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 5));
      return inner(slug, page);
    };
    const n = nav(arena);
    await n.enter('a');
    calls = 0;
    await Promise.all([n.loadMore(), n.loadMore()]); // a double-click on "load more…"
    expect(calls).toBe(1);
    expect(n.blocks).toHaveLength(4); // page 2 appended once, not twice
  });

  it('a failed page surfaces an error and is retried, not skipped', async () => {
    const arena = makeArena();
    const inner = arena.getContentsPage;
    let fail = true;
    arena.getContentsPage = async (slug, page) => {
      if (page === 2 && fail) {
        const e = new Error('rl');
        e.rateLimited = true;
        throw e;
      }
      return inner(slug, page);
    };
    const n = nav(arena);
    await n.enter('a');
    await n.loadMore(); // 429 — no unhandled rejection, and the counter holds
    expect(n.error).toMatch(/slow down/i);
    expect(n.blocks).toHaveLength(3);
    fail = false;
    await n.loadMore(); // the same page is retried, not jumped over
    expect(n.blocks).toHaveLength(4);
    expect(n.error).toBeNull();
  });

  it('openBlockDeep pages forward to a block outside the loaded window', async () => {
    const n = nav(makeArena());
    await n.enter('a');
    expect(n.blocks.find((b) => b.id === 13)).toBeUndefined(); // page 2 is not loaded
    const opened = await n.openBlockDeep(13);
    expect(opened?.id).toBe(13);
    expect(n.active?.id).toBe(13);
  });

  it('openBlockDeep returns null for an unknown id and for a drill node', async () => {
    const n = nav(makeArena());
    await n.enter('a');
    expect(await n.openBlockDeep(999)).toBeNull(); // exhausts the pages, never spins
    expect(n.active).toBeNull();
    expect(await n.openBlockDeep(12)).toBeNull(); // a Channel entry is not stage content
    expect(n.active).toBeNull();
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
    await n.enter('b');
    expect(n.landing()).toBeNull(); // only a denylisted Link → no auto-open
    expect(n.active).toBeNull();
  });

  it('surfaces a connection-fetch failure instead of swallowing it (ISSUES I4)', async () => {
    const arena = makeArena();
    arena.getConnections = async () => {
      const e = new Error('rl');
      e.rateLimited = true;
      throw e;
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const n = nav(arena);
    await n.enter('a');
    expect(n.connections).toEqual([]); // still degrades to a calm empty strip
    expect(warn).toHaveBeenCalled(); // ...but a developer can see the failure
    warn.mockRestore();
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
