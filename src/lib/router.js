/**
 * Hash routing. The hash encodes the drill path by stable channel slugs plus an
 * optional open block id (`#a/b/c/b:47749402`) — deep-links key on block *id*, not
 * ordinal, so reorders in Are.na don't break shared links. Pure fns + a thin
 * onhashchange wrapper. Depth cap 8 (cycle guard lives in nav resolution).
 */
export const DEPTH_CAP = 8;

/** @param {string[]} slugs @param {number} [blockId] */
export function encodePath(slugs = [], blockId) {
  const capped = slugs.filter(Boolean).slice(0, DEPTH_CAP);
  const path = capped.map(encodeURIComponent).join('/');
  let hash = '#' + path;
  if (blockId != null) hash += (path ? '/' : '') + 'b:' + blockId;
  return hash;
}

/** @param {string} hash @returns {{slugs:string[], blockId:number|null}} */
export function decodeHash(hash = '') {
  const raw = String(hash).replace(/^#/, '');
  if (!raw) return { slugs: [], blockId: null };
  const slugs = [];
  let blockId = null;
  for (const part of raw.split('/').filter(Boolean)) {
    if (part.startsWith('b:')) {
      const n = Number(part.slice(2));
      blockId = Number.isFinite(n) ? n : null;
    } else {
      slugs.push(decodeURIComponent(part));
    }
  }
  return { slugs: slugs.slice(0, DEPTH_CAP), blockId };
}

/** Subscribe to hash changes; returns an unsubscribe fn. */
export function onHash(cb) {
  const handler = () => cb(decodeHash(window.location.hash));
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}

/** Set the hash (drives navigation via onHash). */
export function navigate(slugs, blockId) {
  window.location.hash = encodePath(slugs, blockId);
}
