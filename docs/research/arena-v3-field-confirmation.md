# Are.na V3 field map

This is the authoritative map of the Are.na V3 JSON that Commonplace normalizes from.
Every raw V3 block is turned into an internal `NormBlock` by
[`src/lib/model.js`](../../src/lib/model.js), and the single network seam that fetches
that JSON lives in [`src/lib/arena.js`](../../src/lib/arena.js). If you are wondering
which field a renderer or nav node ultimately reads, this document is the source of
truth — it supersedes the V2-derived names that still appear in
[`../design/organizing-model.md`](../design/organizing-model.md) and
[`../design/embedding.md`](../design/embedding.md) where they differ. All paths below
were confirmed live against `https://api.are.na/v3` (channel `arena-influences`, which
exercises all six block kinds).

## API shape essentials

- **V3 is live and browser-fetchable unauthenticated.** `GET /v3/channels/:slug` → `200`.
  With an `Origin` header the server returns `Access-Control-Allow-Origin: *`
  (`Vary: Authorization, Origin`), so a cross-origin browser fetch works with **no proxy
  and no token**. `arena.js` issues plain `fetch` calls accordingly.
- **Meta and contents are two separate calls.** `GET /v3/channels/:slug` returns channel
  metadata only — there is no `contents` array on it. The blocks come from a second call,
  `GET /v3/channels/:slug/contents`. (The V2-era "meta + first page in one call"
  assumption does not hold for V3.) This is why `arena.js` has both `getChannelMeta` and
  `getContentsPage`.
- **Rate-limit headers are not browser-readable.** `X-RateLimit-Limit/Reset/Tier/Window`
  exist server-side, but `Access-Control-Expose-Headers` is empty and no `Retry-After` is
  sent, so cross-origin JS gets `null` from `response.headers.get('X-RateLimit-Reset')`.
  Backoff therefore keys on the `429` **status alone** — see [Rate limiting](#rate-limiting)
  below. (This corrects the "backoff off `X-RateLimit-Reset`" phrasing in
  [`./arena-api-v3.md`](./arena-api-v3.md), which assumed server-side header visibility.)

## Type discriminator

`block.type` is one of `Image`, `Text`, `Link`, `Embed`, `Attachment`, `Channel`.
`blockKind(b)` in `model.js` switches purely on `type` (it does **not** read `base_type`,
which is `"Block"` for the five block kinds and absent for `Channel`). One case is special:

```js
case 'Link':
  return isArenaChannelLink(b.source?.url) ? 'channel' : 'link';
```

A `Link` whose `source.url` points at an are.na channel is normalized to a `channel`
drill node rather than a link card. Anything with an unrecognized `type` becomes
`kind: 'unknown'` instead of throwing.

## Per-kind field map

Each row lists the V3 JSON paths and the `NormBlock` fields `normalizeBlock` populates
from them.

| kind (`type`) | title source | V3 paths read → `NormBlock` |
|---|---|---|
| **Image** | `title` | `image.{large,medium,small}.src` and `image.src` → `image.src`/`image.thumb`; `image.{small,medium,large}.{src,width}` → `image.srcset` (width descriptors); `image.alt_text` → `image.alt`; `image.aspect_ratio` → `image.aspectRatio`; `image.blurhash` → `image.blurhash` |
| **Text** | `title`, else first line of `content.plain`, else `"Untitled"` | `content.html` → `html` (also available: `content.markdown`, `content.plain`) |
| **Link** | `title` | `source.url` → `link.url`; `source.provider.name` → `link.provider`; `source.title` → `link.title`; thumbnail `image.*` → `link.thumb` + `image` |
| **Embed** | `title` | `embed.html` → `embedHtml`; `embed.type` (`video`/`rich`) → `embedType`; thumbnail `image.*` → `image`. **`embed.url` is null — always render `embed.html`.** |
| **Attachment** | `title` | `attachment.url` → `attachment.url`; `attachment.content_type` → `attachment.contentType`; `attachment.filename` → `attachment.filename`; `attachment.file_extension` → `attachment.ext`; preview `image.*` → `image` |
| **Channel** | `title` | `slug` (or `extractSlug(source.url)` for a normalized Link) → `channelSlug`; `counts.contents ?? counts.blocks` → `count` (drives the `>ch N` label) |

Image srcset detail: the API exposes `small`/`medium`/`large`/`square` variants (each with
`src` and a retina `src_2x`), but `buildImage` only builds a width-descriptor srcset from
`small`/`medium`/`large`. `src` resolves to `large || medium || src` and `thumb` to
`small || medium || src`. `embedHtml` is intentionally **not** sanitized — the embed is
isolated in a sandboxed iframe downstream.

## Title derivation

`deriveTitle(b)` resolves in order: non-empty `title` → first line of `content.plain`
(Text blocks, whose `title` is usually null) → first line of `description.plain` →
`"Untitled"`. First lines longer than 80 chars are truncated with an ellipsis. **There is
no `generated_title` in V3** — the old V2 field that some design docs reference does not
exist, so titles must be derived.

## Availability and ordering

Every block carries `state` (e.g. `"available"`) and `visibility` (e.g. `"public"`).
`getContentsPage` filters with `isAvailable` (`state === 'available'`) **before**
normalizing and numbering, so non-available blocks never reach the renderers. Ordering is
the `data[]` array order as returned — each block also has a `connection.position`, but the
array is already in that order, so nothing re-sorts.

## Channel meta (`GET /v3/channels/:slug`)

Top-level keys: `id, slug, title, description{markdown,html,plain}, metadata, counts{blocks,channels,contents,collaborators}, visibility, state, owner, collaborators, created_at, updated_at, _links, can, type`.

`getChannelMeta` keeps `{ slug, title, description, counts }`, where `description` is
`description.html || description.plain`. The section header is `title` + `description.html`
— **not** `metadata.description`; `metadata` is a separate, often-null field.
`visibility` may be `"closed"` (readable, not open to edits) or `"public"`; both are
fetchable. Only `"private"` fails, which is the per-section degrade case.

## Contents pagination (`GET /v3/channels/:slug/contents`)

```
{ data: Block[], meta: { current_page, next_page, prev_page, per_page, total_pages, total_count, has_more_pages } }
```

`getContentsPage` paginates on `meta.has_more_pages` / `meta.next_page` and requests
`per=100` (the documented maximum). It returns `{ blocks, hasMore, nextPage }` with
`blocks` already filtered and normalized.

## Connections (`GET /v3/channels/:slug/connections`)

```
{ data: Channel[], meta }
```

Each item is a **Channel** object with a directly-navigable `slug`, plus `title`, `id`,
`type: "Channel"`, and `counts`. `getConnections` returns `{ channels: [{ slug, title }] }`
— no URL extraction needed, since the slug is already usable for a sideways jump.

## Rate limiting

Because the `X-RateLimit-*` headers are invisible to cross-origin JS (see above),
`fetchJson` in `arena.js` cannot read a reset time. On a `429` it retries up to
`maxRetries` (default 2) with an **escalating linear** backoff — `backoffMs * (attempt + 1)`,
i.e. 1500ms then 3000ms — and throws a `rateLimited` error once retries are exhausted. No
header-based refinement is possible.

---

Build plan: [`../../.agents/docs/plans/2026-07-11-arenotebook-build.md`](../../.agents/docs/plans/2026-07-11-arenotebook-build.md).
Known-issue audit: [`../../.agents/docs/ISSUES.md`](../../.agents/docs/ISSUES.md).
