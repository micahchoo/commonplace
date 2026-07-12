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
const DENY = [
  // Social — refuse framing site-wide.
  'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'threads.net',
  'linkedin.com', 'reddit.com', 'pinterest.com', 'tiktok.com', 'tumblr.com',
  // Media/app platforms (video arrives as an Embed block, not a Link).
  'youtube.com', 'youtu.be', 'twitch.tv', 'spotify.com', 'figma.com',
  // Dev.
  'github.com', 'gitlab.com', 'stackoverflow.com',
  // News / publishing with X-Frame-Options.
  'nytimes.com', 'wsj.com', 'washingtonpost.com', 'theguardian.com', 'bbc.com',
  'bloomberg.com', 'ft.com', 'economist.com', 'newyorker.com', 'medium.com',
  'e-flux.com',
  // Hosted blogs / apps that refuse (per-user subdomains → registrable-domain match).
  'wordpress.com', 'substack.com', 'notion.so', 'notion.site', 'quora.com', 'amazon.com',
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
