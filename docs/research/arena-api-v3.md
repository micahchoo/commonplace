# Are.na API V3 vs V2 — evaluation & recommendation

> Resolves **"Evaluate Are.na API V3 vs staying on deprecated V2"** (`binder-d4d4`).
> Empirically probed against the live API + `are.na/developers/explore` docs on 2026-07-11.

## Recommendation: build on **V3 now**

This reverses the earlier "V2 behind an adapter" lean — the fresh evidence favors V3:

- **V3 is live, public-readable, CORS `*`, no auth** (verified: `GET /v3/channels/:slug` → 200, `ACAO: *`). Same load-bearing property Binder needs, and reads are "Optional"-auth (work unauthenticated).
- **V3 is the actively-documented, going-forward API**; V2 is banner-deprecated. No V2 sunset date is published, but building a *new* app on a deprecated API to migrate later is a false economy.
- **Every field the design needs exists in V3**, just renamed/renested (mapping below) — a mechanical remap, not a redesign. `embed.html`, `source.url`, `attachment.url` are unchanged.
- **V3 publishes rate limits + `X-RateLimit-*` headers**, which makes the resilience story concrete (backoff off `X-RateLimit-Reset`) and *validates* the design's lazy/cached/no-fetch-all decisions — V3's docs literally say "Paginate, Don't Enumerate."
- Still **isolate all Are.na calls behind the thin adapter** the organizing model already mandates, so the shape lives in one place.

**Honest costs:** (1) the design docs reference V2 field names → a bounded translation per the mapping below; (2) V3's **guest rate limit (30 req/min)** is a real ceiling to design around.

## Verified V3 facts

- Base `https://api.are.na`; endpoints under `/v3/…`. Reads are "Optional"-auth → **unauthenticated public reads work, CORS `*`**. (Auth, when used: OAuth2 PKCE or Personal Access Tokens, scopes `read`/`write`.)
- **Pagination:** `page` + `per` (default 24, **max 100**). Responses are `{ data: [...], meta: {...} }` with `meta.{current_page, per_page, total_pages, total_count, next_page, prev_page, has_more_pages}`. Docs mandate paginating on demand — no `per=100` enumerate-loops.
- **Rate limits (enforced, per-minute):** Guest 30 · Free 120 · Premium 300 · Supporter 600. Headers on every response: `X-RateLimit-Limit/Tier/Window/Reset`; `429` on exceed. Acceptable-use forbids scraping/bulk (per-user runtime fetch is fine).
- **Channel object:** no embedded `contents`/`length`; instead `counts`, `_links` (hypermedia), `visibility` (replaces `status`), `metadata`, `description`, `title`, `slug`, `owner`, `state`, `type`.
- **Contents:** `GET /v3/channels/:slug/contents` → `{data, meta}`. **Connections:** `GET /v3/channels/:slug/connections` → `{data, meta}`. (No `/blocks` sub-endpoint → 404.)

## V2 → V3 field mapping (the migration delta)

| Concept | V2 | V3 |
|---|---|---|
| discriminator | `class` + `base_class` | `type` + `base_type` |
| media/embed block | `class: "Media"` | **`type: "Embed"`** |
| embed HTML | `embed.html` | `embed.html` — **unchanged** (`embed:{html,type,source_url,thumbnail_url,…}`) |
| link URL | `source.url`, `source.provider.name` | `source.url` (`source:{provider,title,url}`) — unchanged |
| text body | `content_html` | **`content.html`** (`content:{html,markdown,plain}`) |
| image | `image.display/thumb/original.url` | `image.large` (+ `blurhash`, `aspect_ratio`, `content_type`, `filename`…) — confirm exact URL fields at build |
| attachment | `attachment.url` / `.content_type` / `.file_name` | `attachment.url` / `.content_type` / `.filename` (+`file_extension`) — near-identical |
| nav label | `generated_title` (always present) | **derive** from `title` (nullable) `||` `description` `||` "Untitled" — no `generated_title` |
| ordering | `block.position` | order = `data[]` sequence; per-block `connection` object holds position/connected_at |
| visibility | `status` (public/closed/private) | `visibility` |
| count | channel `length` | channel `counts` |
| contents fetch | embedded in channel + `/contents` (bare array) | `/contents` → `{data, meta}` (no embedded contents) |
| pagination signal | `length` + compute pages | `meta.has_more_pages` / `meta.next_page` |

All six block kinds are present (`Text, Link, Embed, Image, Attachment, Channel`). The embedding decisions survive unchanged in spirit: `Embed.embed.html` → sandboxed `srcdoc`; `Link.source.url` → iframe/denylist; `Image.image.large` → `<img>`; `Attachment.attachment.url` → PDF; `Text.content.html` → sanitized inline; `Channel` → drill.

## Rate limits — a real constraint (guest = 30/min)

Unauthenticated = **30 requests/minute**. A Binder page view (N section metas + drill + connections) spends several requests; 30/min is fine for one user browsing *with* the design's in-session cache + lazy pagination, but tight under heavy drilling. Mitigations (mostly already decided): cache resolved channels; lazy-load pages on demand (V3 mandates this); fetch section metas, not full contents, at root; **honor `429` with backoff**. Lifting to Free (120/min) needs a token — but a token in a static deploy is the same secret-exposure tradeoff rejected for private channels, so keep it a **power-user toggle, default guest**. This concretizes the "runtime resilience" fog.

> **Correction (2026-07-11, verified live — see `arena-v3-field-confirmation.md`):** the `X-RateLimit-*` headers are **not browser-readable**. They are present server-side but `Access-Control-Expose-Headers` is empty and no `Retry-After` is sent, so cross-origin client JS gets `null` from `response.headers.get('X-RateLimit-Reset')`. Backoff must therefore key on the **`429` status alone** (fixed/exponential), *not* on `X-RateLimit-Reset`. The earlier "backoff off `X-RateLimit-Reset`" phrasing assumed server-side header visibility.

## Consequences for the map

- Standing **Data** decision updated: build on **Are.na V3** (public reads, CORS, no auth).
- `organizing-model.md` and `embedding.md` express logic against V2 field names; each now carries a banner pointing here, and the field translation is a **migration task** (bounded, mechanical).
- **Runtime-resilience** fog gains a concrete requirement: honor `X-RateLimit-*` + `429` backoff.
