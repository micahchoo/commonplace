# Are.na V3 — live field confirmation (Task 0 spike)

> Resolves the Wave 0 spike of `docs/superpowers/plans/2026-07-11-arenotebook-build.md`.
> Probed live against `https://api.are.na/v3` on 2026-07-11 (channel `arena-influences`,
> which contains all six block kinds). This is the **authoritative field map** that
> `src/lib/model.js` and `src/lib/arena.js` code against — it supersedes the V2-derived
> field names in `organizing-model.md` / `embedding.md` where they differ.

## Load-bearing verifications

- **V3 is live**, `GET /v3/channels/:slug` → `200`.
- **CORS:** with an `Origin` header, `Access-Control-Allow-Origin: *`, `Vary: Authorization, Origin`. **Browser fetch works unauthenticated, no proxy.** (Without an `Origin` header the server omits CORS headers — earlier server-side probes that reported "no ACAO" were an artifact of not sending `Origin`.)
- **Rate-limit headers are NOT browser-readable (E-1 confirmed):** `X-Ratelimit-Limit/Reset/Tier/Window` are present server-side, but `Access-Control-Expose-Headers` is **empty**, and `Retry-After` is not sent. Cross-origin JS therefore gets `null` from `response.headers.get('X-RateLimit-Reset')`. **⇒ Task 22 backs off on the `429` status alone** (fixed/exponential); no header-based refinement is possible. Correct `arena-api-v3.md` §Rate limits accordingly.
- **Two calls, not one:** `GET /v3/channels/:slug` returns meta only (no `contents` array); contents come from `GET /v3/channels/:slug/contents`. (The V2-era design assumption of "meta + first page in one call" is wrong for V3.)

## Discriminator

`block.type` ∈ `{Image, Text, Link, Embed, Attachment, Channel}`. `base_type` is `"Block"` for the five block kinds and **absent/None for `Channel`**. **`blockKind` switches on `type`.**

## Per-kind field map (confirmed JSON paths)

| kind | availability | label source | render payload |
|---|---|---|---|
| **Image** | `state == "available"` | `title` | `image.src` (original, cloudfront) + resized variants `image.{small,medium,large,square}.{src,src_2x}` (webp/jpeg via `images.are.na`); `image.alt_text`, `image.aspect_ratio`, `image.blurhash` |
| **Text** | `state == "available"` | `title` is usually **null** → derive from `content.plain` (first line, truncated) → else `"Untitled"` | `content.html` (also `.markdown`, `.plain`) |
| **Link** | `state == "available"` | `title` | `source.url`, `source.title`, `source.provider.name`/`.url`; thumbnail `image.src` (+ variants) for the fallback card |
| **Embed** | `state == "available"` | `title` | `embed.html` (an embedly `<iframe>` string; **`embed.url` is null — use `embed.html`**), `embed.type` (`video`/`rich`); `source.url`; thumbnail `image.src` |
| **Attachment** | `state == "available"` | `title` | `attachment.url`, `attachment.content_type`, `attachment.filename`, `attachment.file_extension`; preview `image.src` |
| **Channel** | `state == "available"` | `title` | drill node: `slug` (direct — no URL extraction), `counts.contents` (→ `>ch N`); `description` may be null |

Notes:
- **`deriveTitle`** = `title` → (`content.plain` first line, for Text) → `description.plain` → `"Untitled"`. There is **no `generated_title`** in V3.
- **Ordering** = the `data[]` array order (each block also has a `connection.position`, but the array is already ordered).
- Every block carries `state` (`"available"`) and `visibility` (`"public"`). **Filter `state == "available"`** before numbering.

## Channel meta (`GET /v3/channels/:slug`)

Keys: `id, slug, title, description{markdown,html,plain}, metadata (null here), counts{blocks,channels,contents,collaborators}, visibility, state, owner, collaborators, created_at, updated_at, _links, can, type`.

- **Section header** = `title` + `description.html` (NOT `metadata.description` — `metadata` is a separate, often-null field).
- `visibility` may be `"closed"` (readable, not open to edits) or `"public"`; both are fetchable. Only `"private"` fails — that's the per-section degrade case.

## Contents pagination (`GET /v3/channels/:slug/contents`)

`{ data: Block[], meta: { current_page, next_page, prev_page, per_page, total_pages, total_count, has_more_pages } }`. **Paginate on `meta.has_more_pages` / `meta.next_page`.** `per` max 100.

## Connections (`GET /v3/channels/:slug/connections`)

`{ data: Channel[], meta }`. Each item is a **Channel** object with `slug` (direct, navigable), `title`, `id`, `type:"Channel"`, `counts`. `getConnections` returns `{slug,title}[]` with no URL extraction needed.

## Consequences for the plan (answer-back)

- **Assumption 1 corrected:** image URL is `image.src` **plus** `image.{small,medium,large}` variants (srcset *is* supported); channel description is `description`, not `metadata.description`; contents is a separate call.
- **Assumption 7 / E-1 confirmed:** rate-limit headers unreadable in-browser → 429-status backoff only.
- **Availability:** V2 `state=="available"` translates directly — V3 blocks carry `state`.
- **`deriveTitle`** must special-case Text (null title → `content.plain`).
