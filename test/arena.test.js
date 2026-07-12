import { describe, it, expect, vi } from 'vitest';
import { createArena } from '../src/lib/arena.js';
import channelFixture from './fixtures/v3-channel.json';
import contentsFixture from './fixtures/v3-contents.json';
import connectionsFixture from './fixtures/v3-connections.json';

const ok = (body) => ({ ok: true, status: 200, json: async () => body });

function mockFetch(map) {
  return vi.fn(async (url) => {
    for (const [needle, body] of Object.entries(map)) {
      if (url.includes(needle)) return ok(body);
    }
    return { ok: false, status: 404, json: async () => ({}) };
  });
}

describe('arena adapter', () => {
  it('getContentsPage returns available NormBlocks in order with hasMore from meta', async () => {
    const fetchImpl = mockFetch({ '/contents': contentsFixture });
    const arena = createArena({ fetchImpl });
    const { blocks, hasMore, nextPage } = await arena.getContentsPage('arena-influences');
    expect(blocks).toHaveLength(6); // all fixture blocks are state:available
    expect(blocks[0].kind).toBe('image');
    expect(hasMore).toBe(true);
    expect(nextPage).toBe(2);
  });

  it('filters non-available blocks before normalizing', async () => {
    const withHidden = { ...contentsFixture, data: [...contentsFixture.data, { id: 1, type: 'Text', state: 'private' }] };
    const fetchImpl = mockFetch({ '/contents': withHidden });
    const arena = createArena({ fetchImpl });
    const { blocks } = await arena.getContentsPage('x');
    expect(blocks).toHaveLength(6);
  });

  it('caches a page — second call does not refetch', async () => {
    const fetchImpl = mockFetch({ '/contents': contentsFixture });
    const arena = createArena({ fetchImpl });
    await arena.getContentsPage('arena-influences', 1);
    await arena.getContentsPage('arena-influences', 1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('getChannelMeta maps description.html and caches', async () => {
    const fetchImpl = mockFetch({ '/channels/arena-influences': channelFixture });
    const arena = createArena({ fetchImpl });
    const meta = await arena.getChannelMeta('arena-influences');
    expect(meta.title).toBe('Arena Influences');
    expect(meta.description).toContain('<p>');
    await arena.getChannelMeta('arena-influences');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('getConnections returns navigable {slug,title} items', async () => {
    const fetchImpl = mockFetch({ '/connections': connectionsFixture });
    const arena = createArena({ fetchImpl });
    const { channels } = await arena.getConnections('arena-influences');
    expect(channels[0].slug).toBe('what-makes-web-like');
    expect(channels).toHaveLength(2);
  });

  it('flags a 429 as rate-limited', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) }));
    const arena = createArena({ fetchImpl });
    await expect(arena.getContentsPage('x')).rejects.toMatchObject({ code: 429, rateLimited: true });
  });
});
