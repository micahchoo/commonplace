/**
 * Build the root-cover contact sheet: the page-1 blocks across the configured
 * channels that carry an image thumbnail. Reuses arena's page cache, so this also
 * warms channel entry (entering a channel afterwards reads the same cached page).
 * Dead/unreachable channels are skipped (Promise.allSettled), never fatal.
 *
 * @param {{getContentsPage:(slug:string,page?:number)=>Promise<{blocks:any[]}>}} arena
 * @param {string[]} slugs
 * @returns {Promise<Array<{id:number, slug:string, thumb:string, title:string, blurhash?:string, ratio?:number}>>}
 */
export async function collectThumbnails(arena, slugs = []) {
  const settled = await Promise.allSettled(slugs.map((slug) => arena.getContentsPage(slug, 1)));
  const thumbs = [];
  settled.forEach((r, i) => {
    if (r.status !== 'fulfilled') return;
    const slug = slugs[i];
    for (const b of r.value.blocks || []) {
      const thumb = b.image?.thumb || b.image?.src;
      if (thumb) {
        thumbs.push({ id: b.id, slug, thumb, title: b.title, blurhash: b.image?.blurhash, ratio: b.image?.aspectRatio });
      }
    }
  });
  return thumbs;
}
