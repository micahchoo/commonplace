/**
 * A static app cannot detect a framing refusal at runtime — X-Frame-Options / CSP
 * `frame-ancestors` headers aren't readable cross-origin, and an iframe's `load` event
 * fires even for blocked frames. So this curated denylist of known refusers is what
 * routes a link to a preview card instead of a blank iframe. Everything not listed is
 * framed inline.
 *
 * Matched on the **registrable domain and its subdomains** (`endsWith('.' + domain)`),
 * because per-user hosts like `someone.wordpress.com` all refuse — an exact-hostname
 * list can't enumerate them. It can't be exhaustive; the always-present "open in new
 * tab" escape hatch covers any miss, and you can add domains here.
 */
// Entries below (except where noted) were verified by inspecting live response
// headers on 2026-07-16 — each sends X-Frame-Options DENY/SAMEORIGIN or a CSP
// `frame-ancestors` that excludes third-party origins. Sites confirmed *frameable*
// and deliberately kept OFF: are.na, cosmos.so, cargo.site, squarespace.com,
// wixsite.com, unsplash.com, bandcamp.com, glitch.com, wikipedia.org, archive.org —
// don't add them or we needlessly blank a page that would have framed fine.
const DENY = [
  // Social — refuse framing site-wide.
  'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'threads.net',
  'linkedin.com', 'reddit.com', 'pinterest.com', 'tiktok.com', 'tumblr.com',
  'bsky.app', 'discord.com',
  // Media / app platforms (video & audio usually arrive as an Embed block, not a Link).
  'youtube.com', 'youtu.be', 'twitch.tv', 'spotify.com', 'figma.com',
  'vimeo.com', 'soundcloud.com', 'canva.com',
  // Big tech (google.com covers docs./maps./drive. via subdomain match; apple.com covers music./podcasts.).
  'google.com', 'apple.com', 'paypal.com', 'stripe.com', 'ebay.com', 'amazon.com',
  // Dev / notebooks.
  'github.com', 'gitlab.com', 'stackoverflow.com', 'codepen.io', 'replit.com',
  'observablehq.com', 'itch.io',
  // Design / portfolio platforms (common Are.na link targets).
  'behance.net', 'dribbble.com', 'artstation.com', 'deviantart.com', 'flickr.com',
  'webflow.io', 'readymag.com', 'issuu.com', 'linktr.ee',
  // Files / productivity.
  'dropbox.com', 'airtable.com',
  // Academic.
  'jstor.org', 'arxiv.org',
  // News / publishing with X-Frame-Options / frame-ancestors.
  'nytimes.com', 'wsj.com', 'washingtonpost.com', 'theguardian.com', 'bbc.com',
  'bloomberg.com', 'ft.com', 'economist.com', 'newyorker.com', 'medium.com',
  'e-flux.com', 'cnn.com', 'reuters.com', 'forbes.com',
  // Hosted blogs / apps that refuse (per-user subdomains → registrable-domain match).
  'wordpress.com', 'substack.com', 'notion.so', 'notion.site', 'quora.com',
];

/** True when the URL's host is a known framing-refuser (its registrable domain or a subdomain). */
export function isDenylisted(url) {
  if (!url) return false;
  try {
    const h = new URL(url).hostname.toLowerCase();
    return DENY.some((d) => h === d || h.endsWith('.' + d));
  } catch {
    return false;
  }
}
