/**
 * The one seam to the Are.na V3 REST API. Everything else consumes NormBlocks.
 * Plain module — SvelteMap is an ordinary class import.
 *
 * Field paths per docs/research/arena-v3-field-confirmation.md. Channel meta and
 * contents are two separate calls in V3. Rate-limit headers are NOT browser-readable
 * (E-1), so 429 backoff keys on the status alone (fixed, escalating) — no Reset header.
 */
import { SvelteMap } from 'svelte/reactivity';
import { normalizeBlock, isAvailable } from './model.js';

export const ARENA_BASE = 'https://api.are.na/v3';

const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {{fetchImpl?: typeof fetch, base?: string, maxRetries?: number, sleep?: (ms:number)=>Promise<void>, backoffMs?: number}} [opts]
 */
export function createArena({
  fetchImpl = (...a) => fetch(...a),
  base = ARENA_BASE,
  maxRetries = 2,
  sleep = defaultSleep,
  backoffMs = 1500,
} = {}) {
  const metaCache = new SvelteMap(); // slug -> meta
  const pageCache = new SvelteMap(); // `${slug}:${page}` -> { blocks, hasMore, nextPage }
  const enc = encodeURIComponent;

  async function fetchJson(url) {
    for (let attempt = 0; ; attempt++) {
      const res = await fetchImpl(url);
      if (res.status === 429) {
        if (attempt < maxRetries) {
          await sleep(backoffMs * (attempt + 1)); // no X-RateLimit-Reset — headers unreadable (E-1)
          continue;
        }
        const err = new Error('rate-limited');
        err.code = 429;
        err.rateLimited = true;
        throw err;
      }
      if (!res.ok) {
        const err = new Error(`arena ${res.status}`);
        err.code = res.status;
        throw err;
      }
      return res.json();
    }
  }

  async function getChannelMeta(slug) {
    if (metaCache.has(slug)) return metaCache.get(slug);
    const j = await fetchJson(`${base}/channels/${enc(slug)}`);
    const meta = {
      slug: j.slug ?? slug,
      title: j.title ?? slug,
      description: j.description?.html || j.description?.plain || '',
      counts: j.counts ?? null,
    };
    metaCache.set(slug, meta);
    return meta;
  }

  async function getContentsPage(slug, page = 1, per = 100) {
    const key = `${slug}:${page}`;
    if (pageCache.has(key)) return pageCache.get(key);
    const j = await fetchJson(`${base}/channels/${enc(slug)}/contents?page=${page}&per=${per}`);
    const blocks = (j.data || []).filter(isAvailable).map(normalizeBlock);
    const result = {
      blocks,
      hasMore: Boolean(j.meta?.has_more_pages),
      nextPage: j.meta?.next_page ?? null,
    };
    pageCache.set(key, result);
    return result;
  }

  async function getConnections(slug) {
    const j = await fetchJson(`${base}/channels/${enc(slug)}/connections`);
    const channels = (j.data || [])
      .filter((c) => c && c.slug)
      .map((c) => ({ slug: c.slug, title: c.title || c.slug }));
    return { channels };
  }

  return { getChannelMeta, getContentsPage, getConnections, metaCache, pageCache };
}

/** Default app-wide instance (real fetch). */
export const arena = createArena();
