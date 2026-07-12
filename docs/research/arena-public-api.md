# Are.na public API — orientation

A big-picture map of the Are.na public API and why Commonplace can read it at
runtime, straight from a static browser app, with no server and no auth. Read
this first for the *why* and the shape of the endpoints; for the exact V3 JSON
field paths that `src/lib/arena.js` and `src/lib/model.js` code against, the
authoritative reference is [`arena-v3-field-confirmation.md`](./arena-v3-field-confirmation.md).

> **Heritage / version note.** The original API research for Binder (the project
> Commonplace is rebuilt from) targeted Are.na **V2**. Commonplace runs on **V3**
> (`https://api.are.na/v3`). Where V2 and V3 field names differ, the code and the
> field-confirmation doc win — this page is kept to V3.

## Why a static app can read Are.na directly

Two facts make the runtime-fetch design possible with no proxy:

- **No auth for public *or* closed channels.** Both are fully readable
  unauthenticated. Only **private** channels need a token.
- **CORS is wide open.** Responses carry `Access-Control-Allow-Origin: *`, so a
  browser on any origin can `fetch` the API directly.

One CORS wrinkle worth knowing: the server only emits CORS headers when the
request carries an `Origin` header (real browsers always do). A server-side probe
without `Origin` sees *no* `Access-Control-Allow-Origin` and can wrongly conclude
CORS is closed.

```
Access-Control-Allow-Origin: *
Vary: Authorization, Origin
```

## Endpoints Commonplace uses

Base: `https://api.are.na/v3`. All GET, all reads unauthenticated for
public/closed channels. In V3, channel **meta** and channel **contents** are two
separate calls (V2 returned meta plus the first page of contents in one shot —
that assumption does not hold here).

| Endpoint | Returns | Consumed by |
|---|---|---|
| `GET /channels/:slug` | Channel **meta only** — `id, slug, title, description{html,plain,markdown}, counts{blocks,channels,contents,...}, visibility, state, owner`. **No `contents` array.** | `getChannelMeta` — section header is `title` + `description.html` |
| `GET /channels/:slug/contents?page=&per=` | `{ data: Block[], meta: { has_more_pages, next_page, total_count, per_page, ... } }` | `getContentsPage` — page until `meta.has_more_pages` is false |
| `GET /channels/:slug/connections` | `{ data: Channel[], meta }` — each item a Channel (`slug`, `title`, `id`, `counts`) | `getConnections` — sideways jumps to connected channels |

The self-hoster names a channel by URL or bare slug (`extractSlug` in
`model.js`), so channel-discovery endpoints (`GET /channels`) are unneeded.

**Pagination.** Page on `meta.has_more_pages` / `meta.next_page` — there is no
single `length` envelope to divide by. `per` is capped at 100 (`arena.js`
requests `per=100` by default).

## Auth & visibility

Channel `visibility` is one of:

| visibility | Read | Add | Browser-readable without auth? |
|---|---|---|---|
| **public** | everyone | everyone | yes |
| **closed** | everyone | owner/collaborators | yes |
| **private** | owner/collaborators | owner/collaborators | no — needs a token |

OAuth (for private channels) is a code/token flow yielding a **non-expiring
bearer token** — there is no safe place to keep that in a static site, which is
why Commonplace is public/closed only. A private channel degrades gracefully per
section rather than being supported.

## Blocks — the six kinds

`block.type` is the discriminator (`model.js:blockKind` switches on it):
**Image, Text, Link, Embed, Attachment, Channel**. `base_type` is `"Block"` for
the five content kinds and absent for `Channel`. (V2 named these via `class` /
`base_class`, and called the embed kind **Media** — V3 renames it **Embed**.)

Two normalization facts drive rendering:

- **Filter to available first.** Every block carries `state`; keep only
  `state === "available"` (lowercase in V3; V2 used `"Available"`) before
  numbering. That is `model.js:isAvailable`.
- **Titles are derived.** V3 has **no `generated_title`**. `model.js:deriveTitle`
  falls back `title` → (Text's `content.plain` first line, truncated) →
  `description.plain` → `"Untitled"`.

For the exact per-kind field paths (image variants and `srcset`, `content.html`,
`embed.html`, `attachment.*`, etc.) see
[`arena-v3-field-confirmation.md`](./arena-v3-field-confirmation.md).

## Nested channels & connections (the organizing layer)

Channels nest, and Commonplace treats that as first-class navigation:

- A channel's `contents` can include **Channel blocks** — a connected
  sub-channel carrying `slug` / `title` / `counts`, rendered as a drill node.
- A **Link block whose source URL points at an are.na channel** is normalized to
  a channel drill too (`model.js:isArenaChannelLink`), so on-platform links
  behave like nesting rather than external iframes.
- `GET /channels/:slug/connections` lists connected channels cheaply, without
  hydrating every block.

Nesting depth is arbitrary (channels connect channels…), so the organizing model
takes a stance on how deep to spider and how to render the tree.

## The framing problem

**Link** blocks point at arbitrary external sites, many of which refuse to be
iframed via `X-Frame-Options` / CSP (Binder's README already lists NYT, Twitter,
Facebook, GitHub). **Embed** blocks dodge this by shipping an embedly `<iframe>`
string (`embed.html` — `embed.url` is null in V3, so `embed.html` is the payload)
that wraps YouTube / Vimeo / Bandcamp and sidesteps their framing rules. Links do
not get that wrapper, so per-block embedding needs a non-iframeable fallback (the
link card built from `source` + thumbnail). Note this framing constraint lives on
the *content sites*, not on the Are.na API itself, which just serves JSON.

## Rate limits & runtime resilience

Are.na sends `X-Ratelimit-*` headers, but `Access-Control-Expose-Headers` is
empty and `Retry-After` is not sent, so **cross-origin JavaScript cannot read
them** — `response.headers.get('X-RateLimit-Reset')` returns `null` (issue E-1
in [`../../.agents/docs/ISSUES.md`](../../.agents/docs/ISSUES.md)). Consequently
`arena.js` backs off on the **`429` status alone**: a fixed, escalating delay
(`backoffMs * (attempt + 1)`, up to `maxRetries`), with no header-based
refinement possible.

Because runtime-fetch means hitting the API on every page load, Commonplace is
built as a courteous, resilient client: one channel fetch per load, in-session
caches (`metaCache` / `pageCache` / `connCache` in `arena.js`, keyed by slug and
page), no refetch storms, and graceful handling of 404 / private / deleted
channels and network failure.

---

For the build plan that consumes this research, see
[`../../.agents/docs/plans/`](../../.agents/docs/plans/); for the running defect
list, [`../../.agents/docs/ISSUES.md`](../../.agents/docs/ISSUES.md).
