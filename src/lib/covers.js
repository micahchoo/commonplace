/**
 * Contact-sheet cells: the projection from a NormBlock to what `ThumbGrid` draws,
 * plus the root cover's cross-channel sheet.
 *
 * @typedef {Object} Cell
 * @property {number} id
 * @property {string} slug            // the channel the cell belongs to
 * @property {string} [kind]          // NormBlock kind, for the typographic tile
 * @property {string} [channelSlug]   // kind==='channel': where the tile drills to
 * @property {number|null} [count]
 * @property {string} thumb           // '' when the block carries no image
 * @property {string} title
 * @property {string} [blurhash]
 * @property {number} [ratio]
 */

/**
 * One block as a cell. The cell shape is ThumbGrid's interface, and it was written
 * out twice — once here for the root sheet and once in the shell for the in-channel
 * sheet — so a field added to one silently diverged the other.
 *
 * @param {any} b @param {string} slug @returns {Cell}
 */
export function toCell(b, slug) {
  return {
    id: b.id,
    slug,
    kind: b.kind,
    channelSlug: b.channelSlug,
    count: b.count,
    thumb: b.image?.thumb || b.image?.src || '',
    title: b.title,
    blurhash: b.image?.blurhash,
    ratio: b.image?.aspectRatio,
  };
}

/**
 * Build the root-cover contact sheet: the page-1 blocks across the configured
 * channels that carry an image thumbnail. Reuses arena's page cache, so this also
 * warms channel entry (entering a channel afterwards reads the same cached page).
 * Dead/unreachable channels are skipped (Promise.allSettled), never fatal.
 *
 * Image-bearing only, deliberately: the root is a cover, not an index. The
 * in-channel sheet is the one that shows every entry.
 *
 * @param {{getContentsPage:(slug:string,page?:number)=>Promise<{blocks:any[]}>}} arena
 * @param {string[]} slugs
 * @returns {Promise<Cell[]>}
 */
export async function collectThumbnails(arena, slugs = []) {
  const settled = await Promise.allSettled(slugs.map((slug) => arena.getContentsPage(slug, 1)));
  const thumbs = [];
  settled.forEach((r, i) => {
    if (r.status !== 'fulfilled') return;
    for (const b of r.value.blocks || []) {
      if (b.image?.thumb || b.image?.src) thumbs.push(toCell(b, slugs[i]));
    }
  });
  return thumbs;
}
