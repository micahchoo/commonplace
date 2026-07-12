# Are.na API: V2 → V3 migration reference

Commonplace reads public Are.na channels at runtime through the V3 REST API. This
doc records *why* V3 (rather than the deprecated V2 that Binder-era research first
targeted) and the V2→V3 field-name delta, so anyone reading V2-worded design notes
can translate them. For the **authoritative** field paths the live code actually
depends on, see [`arena-v3-field-confirmation.md`](arena-v3-field-confirmation.md),
which was probed against the live API — this doc is the rationale and migration map,
that one is the ground truth.

## Why V3

- **Public, no auth, CORS.** `GET /v3/channels/:slug` returns `200`; on a
  cross-origin request (one carrying an `Origin` header) the server responds with
  `Access-Control-Allow-Origin: *`. Browser fetch works unauthenticated, no proxy —
  the load-bearing property Binder needs.
- **V3 is the going-forward API.** V2 is banner-deprecated with no published sunset;
  building a new app on it to migrate later is a false economy.
- **Every field the design needs exists in V3**, just renamed or renested (table
  below) — a mechanical remap, not a redesign.
- **V3 publishes rate limits** and mandates on-demand pagination ("Paginate, Don't
  Enumerate"), which matches the app's lazy, cached, no-fetch-all design.
- **All Are.na calls stay behind one thin adapter**
  ([`src/lib/arena.js`](../../src/lib/arena.js)); everything else consumes
  normalized blocks ([`src/lib/model.js`](../../src/lib/model.js)), so the V3 shape
  lives in exactly one place.

## Verified V3 facts

- Base `https://api.are.na`, endpoints under `/v3/…`. Reads are optional-auth:
  unauthenticated public reads work. (Auth, when used: OAuth2 PKCE or personal
  access tokens, scopes `read`/`write`.)
- **Pagination:** `page` + `per` (default 24, **max 100**). Responses are
  `{ data: [...], meta: {...} }` with
  `meta.{current_page, per_page, total_pages, total_count, next_page, prev_page, has_more_pages}`.
- **Two calls, not one:** `GET /v3/channels/:slug` returns channel meta only (no
  embedded `contents`); contents come from `GET /v3/channels/:slug/contents`.
  Connections come from `GET /v3/channels/:slug/connections`. There is no `/blocks`
  sub-endpoint (→ 404).
- **Channel object** has no embedded `contents` or `length`; instead `counts`,
  `visibility` (replaces V2 `status`), `description{html,markdown,plain}`, `title`,
  `slug`, `owner`, `state`, `type`, `_links`.

## V2 → V3 field mapping

| Concept | V2 | V3 |
|---|---|---|
| discriminator | `class` + `base_class` | `type` + `base_type` (`base_type` is `"Block"`; **absent for `Channel`**) |
| media/embed block | `class: "Media"` | **`type: "Embed"`** |
| embed HTML | `embed.html` | `embed.html` — **unchanged** (`embed:{html, type, source_url, thumbnail_url,…}`; `embed.type` is `video`/`rich`, `embed.url` is null) |
| link URL | `source.url`, `source.provider.name` | same — `source:{url, title, provider:{name, url}}` |
| text body | `content_html` | **`content.html`** (`content:{html, markdown, plain}`) |
| image | `image.display/thumb/original.url` | `image.src` (original) + variants `image.{small,medium,large}.{src, width}` (→ srcset); plus `image.alt_text`, `image.aspect_ratio`, `image.blurhash` |
| attachment | `attachment.url` / `.content_type` / `.file_name` | `attachment.url` / `.content_type` / `.filename` / `.file_extension` |
| nav label | `generated_title` (always present) | **derive** — `title` → (Text: first line of `content.plain`, truncated) → `description.plain` → `"Untitled"`. No `generated_title`. |
| ordering | `block.position` | order = `data[]` sequence (each block also carries a `connection.position`) |
| visibility | `status` (public/closed/private) | `visibility` (public/closed/private) |
| item count | channel `length` | channel `counts` (`counts.contents`, else `counts.blocks`) |
| contents fetch | embedded in channel + `/contents` (bare array) | `/contents` → `{data, meta}`; no embedded contents |
| pagination signal | `length` + compute pages | `meta.has_more_pages` / `meta.next_page` |

All six V3 block kinds are present — `Text, Link, Embed, Image, Attachment,
Channel` — and each normalizes to a render:

- `Embed.embed.html` → sandboxed iframe `srcdoc`
- `Link.source.url` → iframe (denylist-gated), else a fallback card
- `Image` → `<img>` off `image.src` and its variants
- `Attachment.attachment.url` → PDF / download
- `Text.content.html` → sanitized inline HTML
- `Channel` → drill node (`slug` direct, `counts.contents` → `>ch N`)

An Are.na Link whose `source.url` points at a channel normalizes to a `channel`
drill node rather than a link (see `isArenaChannelLink` /
[`blockKind`](../../src/lib/model.js)).

## Rate limits (guest = 30/min)

Enforced per-minute, by tier: Guest 30 · Free 120 · Premium 300 · Supporter 600,
with `429` on exceed. A single page view (section metas + a drill + connections)
spends several requests, so 30/min is comfortable for one user browsing with the
in-session cache and lazy pagination, but tight under heavy drilling.

The `X-RateLimit-*` headers are present server-side but **not browser-readable**:
`Access-Control-Expose-Headers` is empty and no `Retry-After` is sent, so
cross-origin JS gets `null` from `response.headers.get('X-RateLimit-Reset')`.
Backoff therefore keys on the **`429` status alone** (fixed, escalating), not on any
reset header. The adapter retries with `backoffMs * (attempt + 1)` up to
`maxRetries` — see `fetchJson` in [`src/lib/arena.js`](../../src/lib/arena.js).

Mitigations already built into the adapter: cache resolved channel meta, pages, and
connections in-session (`metaCache` / `pageCache` / `connCache`); lazy-load pages on
demand; fetch section meta, not full contents, at the root. Lifting the ceiling to
Free (120/min) would need a token, but a token in a static deploy is the same
secret-exposure tradeoff rejected elsewhere — it would have to be a power-user
toggle, default guest.

## Related

V2-worded logic still lives in the design notes
[`organizing-model.md`](../design/organizing-model.md) and
[`embedding.md`](../design/embedding.md); translate through the table above. The
build plan lives under [`.agents/docs/plans/`](../../.agents/docs/plans/) and the
open-issue audit at [`.agents/docs/ISSUES.md`](../../.agents/docs/ISSUES.md).
