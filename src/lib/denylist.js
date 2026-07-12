/**
 * A static app cannot detect a framing refusal, so this shipped, full-hostname
 * denylist is the primary defense against blank frames. Matched on the exact
 * hostname (not eTLD+1) — docs.google.com frames while google.com search doesn't,
 * so a registrable-domain match can't express it. Living file; the always-present
 * escape hatch covers any miss. Seeded from docs/design/embedding.md.
 */
const DENY = new Set([
  'nytimes.com', 'www.nytimes.com',
  'twitter.com', 'www.twitter.com', 'x.com', 'www.x.com',
  'facebook.com', 'www.facebook.com',
  'instagram.com', 'www.instagram.com',
  'github.com', 'www.github.com',
  'linkedin.com', 'www.linkedin.com',
  'reddit.com', 'www.reddit.com', 'old.reddit.com',
  'youtube.com', 'www.youtube.com', // watch pages refuse; embeds arrive via Embed, not Link
]);

/** True when the URL's hostname is a known framing-refuser. */
export function isDenylisted(url) {
  if (!url) return false;
  try {
    return DENY.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}
