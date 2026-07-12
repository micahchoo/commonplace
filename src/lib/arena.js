/**
 * The one seam to the Are.na V3 REST API. Everything else consumes NormBlocks.
 * Plain module — SvelteMap is an ordinary class import.
 *
 * Field paths per docs/research/arena-v3-field-confirmation.md. Channel meta and
 * contents are two separate calls in V3. 429 backoff lands in Wave 5 (Task 22);
 * for now a 429 surfaces as a typed error.
 */
import { SvelteMap } from 'svelte/reactivity';
import { normalizeBlock, isAvailable } from './model.js';

export const ARENA_BASE = 'https://api.are.na/v3';

/** Fetch JSON, mapping non-OK responses to typed errors (429 flagged for backoff). */
async function fetchJson(url, fetchImpl) {
  const res = await fetchImpl(url);
  if (!res.ok) {
    const err = new Error(`arena ${res.status}`);
    err.code = res.status;
    err.rateLimited = res.status === 429; // TODO(binder-d4d4): Task 22 backoff
    throw err;
  }
  return res.json();
}

/**
 * @param {{fetchImpl?: typeof fetch, base?: string}} [opts]
 */
export function createArena({ fetchImpl = (...a) => fetch(...a), base = ARENA_BASE } = {}) {
  const metaCache = new SvelteMap(); // slug -> meta
  const pageCache = new SvelteMap(); // `${slug}:${page}` -> { blocks, hasMore, nextPage }
  const enc = encodeURIComponent;

  async function getChannelMeta(slug) {
    if (metaCache.has(slug)) return metaCache.get(slug);
    const j = await fetchJson(`${base}/channels/${enc(slug)}`, fetchImpl);
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
    const j = await fetchJson(`${base}/channels/${enc(slug)}/contents?page=${page}&per=${per}`, fetchImpl);
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
    const j = await fetchJson(`${base}/channels/${enc(slug)}/connections`, fetchImpl);
    const channels = (j.data || [])
      .filter((c) => c && c.slug)
      .map((c) => ({ slug: c.slug, title: c.title || c.slug }));
    return { channels };
  }

  return { getChannelMeta, getContentsPage, getConnections, metaCache, pageCache };
}

/** Default app-wide instance (real fetch). */
export const arena = createArena();
