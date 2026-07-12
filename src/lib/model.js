/**
 * The internal block model. Every renderer and nav node consumes `NormBlock`,
 * never raw V3 JSON. Field paths follow docs/research/arena-v3-field-confirmation.md.
 * Plain module (no runes).
 *
 * @typedef {'image'|'text'|'embed'|'attachment'|'link'|'channel'|'unknown'} Kind
 * @typedef {Object} NormBlock
 * @property {number} id
 * @property {Kind} kind
 * @property {string} title
 * @property {{src:string, thumb?:string, srcset?:string, alt:string, aspectRatio?:number, blurhash?:string}} [image]
 * @property {string} [html]            // text: content.html (pre-sanitize)
 * @property {string} [embedHtml]       // embed.html (NOT sanitized — sandbox isolates)
 * @property {string} [embedType]
 * @property {{url:string, provider?:string, title?:string, thumb?:string}} [link]
 * @property {{url:string, contentType:string, filename:string, ext:string}} [attachment]
 * @property {string} [channelSlug]     // kind==='channel'
 * @property {number|null} [count]      // kind==='channel': item count for `>ch N`
 * @property {Object} raw
 */

const ARENA_HOST_RE = /(^|\.)are\.na$/i;

/** Extract a channel slug from an are.na URL or return a bare slug unchanged. */
export function extractSlug(urlOrSlug) {
  if (!urlOrSlug) return '';
  const s = String(urlOrSlug).trim();
  try {
    const u = new URL(s);
    if (ARENA_HOST_RE.test(u.hostname)) {
      const parts = u.pathname.split('/').filter(Boolean);
      return parts.length ? parts[parts.length - 1] : '';
    }
  } catch {
    /* not a URL — treat as a bare slug */
  }
  return s.replace(/^\/+|\/+$/g, '');
}

/** True when a Link's source URL points at an are.na channel (→ normalize to a drill). */
export function isArenaChannelLink(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (!ARENA_HOST_RE.test(u.hostname)) return false;
    const parts = u.pathname.split('/').filter(Boolean);
    if (!parts.length) return false;
    // /block/:id is a single block, not a channel
    if (parts[0] === 'block') return false;
    return true;
  } catch {
    return false;
  }
}

/** title || (Text content.plain first line) || description.plain || 'Untitled'. No V3 generated_title. */
export function deriveTitle(b) {
  if (!b || typeof b !== 'object') return 'Untitled';
  if (b.title && String(b.title).trim()) return String(b.title).trim();
  const plain = b.content?.plain || b.description?.plain;
  if (plain && plain.trim()) {
    const firstLine = plain.trim().split('\n')[0].trim();
    if (firstLine) return firstLine.length > 80 ? firstLine.slice(0, 79) + '…' : firstLine;
  }
  return 'Untitled';
}

/** Discriminate on V3 `type`; an are.na-channel Link normalizes to a drill node. */
export function blockKind(b) {
  switch (b?.type) {
    case 'Image':
      return 'image';
    case 'Text':
      return 'text';
    case 'Embed':
      return 'embed';
    case 'Attachment':
      return 'attachment';
    case 'Channel':
      return 'channel';
    case 'Link':
      return isArenaChannelLink(b.source?.url) ? 'channel' : 'link';
    default:
      return 'unknown';
  }
}

function buildImage(img) {
  if (!img) return undefined;
  const srcset = ['small', 'medium', 'large']
    .map((k) => (img[k]?.src ? `${img[k].src} ${img[k].width || ''}w`.trim() : null))
    .filter(Boolean)
    .join(', ');
  return {
    src: img.large?.src || img.medium?.src || img.src,
    thumb: img.small?.src || img.medium?.src || img.src,
    srcset: srcset || undefined,
    alt: img.alt_text || '',
    aspectRatio: img.aspect_ratio,
    blurhash: img.blurhash || undefined,
  };
}

/** A raw V3 block → NormBlock. Never throws; unknown/malformed → kind:'unknown'. */
export function normalizeBlock(b) {
  if (!b || typeof b !== 'object') {
    return { id: 0, kind: 'unknown', title: 'Untitled', raw: b };
  }
  const kind = blockKind(b);
  const out = { id: b.id ?? 0, kind, title: deriveTitle(b), raw: b };
  const image = buildImage(b.image);

  switch (kind) {
    case 'image':
      out.image = image;
      break;
    case 'text':
      out.html = b.content?.html || '';
      break;
    case 'embed':
      out.embedHtml = b.embed?.html || '';
      out.embedType = b.embed?.type || null;
      if (image) out.image = image;
      break;
    case 'attachment':
      out.attachment = {
        url: b.attachment?.url || '',
        contentType: b.attachment?.content_type || '',
        filename: b.attachment?.filename || '',
        ext: b.attachment?.file_extension || '',
      };
      if (image) out.image = image;
      break;
    case 'link':
      out.link = {
        url: b.source?.url || '',
        provider: b.source?.provider?.name || '',
        title: b.source?.title || '',
        thumb: image?.thumb,
      };
      if (image) out.image = image;
      break;
    case 'channel':
      out.channelSlug = b.slug || extractSlug(b.source?.url);
      out.count = b.counts?.contents ?? b.counts?.blocks ?? null;
      break;
    default:
      break;
  }
  return out;
}

/** V3 blocks carry state:"available"; filter before numbering (per organizing-model). */
export function isAvailable(b) {
  return b?.state === 'available';
}
