# The organizing model

Commonplace turns a short config — a site title/about plus an ordered list of
public Are.na channel slugs — into a browsable tree. This doc explains how that
tree is *shaped* and *navigated*: how config channels become sections, how blocks
and nested channels form one uniform drill tree, and how the breadcrumb,
connections strip, landing, and hash routing behave. It is the map that
[`src/lib/nav.svelte.js`](../../src/lib/nav.svelte.js),
[`src/lib/router.js`](../../src/lib/router.js), and
[`src/lib/model.js`](../../src/lib/model.js) implement — read it before touching
them. Commonplace is a rebuild of [Binder](https://github.com/clementvalla/binder);
the multi-channel menu is Binder heritage, now with each menu entry an Are.na
channel. The app talks to the **Are.na V3** REST API
(`https://api.are.na/v3`, [`src/lib/arena.js`](../../src/lib/arena.js)); field
paths follow [`arena-v3-field-confirmation.md`](../research/arena-v3-field-confirmation.md).

## The shape in one picture

```
SITE (config: title/about + ordered channel slugs)
│
├─ Section A  (Are.na channel)  ─────────────┐  each section is a channel:
│    ├─ 01 block ....[txt]                    │   • available blocks = ordered entries,
│    ├─ 02 block ....[pdf]                    │     labelled by deriveTitle, tagged by kind
│    ├─ 03 sub-channel .....>ch 8  ── drill ──┼─▶ • a Channel block in contents = a drill node
│    └─ <-> connected: >x >y      ── jump ────┘   • connections strip = sideways jumps
│
├─ Section B  (Are.na channel)   …
└─ Section C  (Are.na channel)   …
```

The **root** is a synthetic "site" node whose entries are the configured section
channels. Below it everything is **uniform**: a channel holds ordered blocks plus
nested Channel drill-nodes, with a connections strip — the same shape at every
depth. One breadcrumb spans the whole tree.

## The block model

Every renderer and nav node consumes a `NormBlock`, never raw Are.na JSON.
`normalizeBlock` (in `model.js`) discriminates on the V3 `type` field and pulls
each kind's fields onto a flat shape:

| V3 `type` | `kind` | Key normalized fields |
|---|---|---|
| `Image` | `image` | `image` — `{ src, thumb, srcset, alt, aspectRatio, blurhash }` |
| `Text` | `text` | `html` (from `content.html`, pre-sanitize) |
| `Embed` | `embed` | `embedHtml` (from `embed.html`), `embedType` |
| `Attachment` | `attachment` | `attachment` — `{ url, contentType, filename, ext }` |
| `Link` | `link` | `link` — `{ url, provider, title, thumb }` |
| `Channel` *(or a `Link` at an are.na channel URL)* | `channel` | `channelSlug`, `count` |
| anything else | `unknown` | — |

Two derivations matter for the index:

- **Label** comes from `deriveTitle(b)`: the block's `title`, else the first line
  of its text/description plain content (trimmed to 80 chars), else `'Untitled'`.
  There is no V3 `generated_title` — the numbered index and kind tag exist partly
  to soften a bare `'Untitled'`.
- **Availability**: only blocks with `state === 'available'` (`isAvailable`) are
  kept, and the filter runs *before* numbering, so the displayed ordinals and
  page math stay consistent.

**Are.na-URL Links normalize to a drill.** `isArenaChannelLink` detects a `Link`
whose `source.url` points at an are.na channel (but not a `/block/:id`) and
`blockKind` returns `channel` for it. Same destination as a native Channel block,
one behavior — and framing it would fail anyway (are.na sends `X-Frame-Options`).

## Sections and the block index

`Nav.loadRoot()` resolves the config's `channels` slugs into the root's entries.
It fetches each channel's meta with `Promise.allSettled` and **degrades per
section**: a reachable channel becomes a `channel`-kind entry carrying its
`title` and `count` (from `counts.contents`); a failed one (404 / private — note
a *closed* channel is still readable, only *private* fails) is marked `dead: true`
and still shown. One bad slug never aborts the whole site.

Inside a section, each entry renders as a numbered row: `deriveTitle` label plus a
kind tag. A `channel`-kind entry shows `>ch N`, where `N` is its `count`, and acts
as a drill node rather than opening a block.

## Drill: breadcrumb, depth cap, cycle guard

The drill stack is `Nav.path`, an array of `{ slug, title, description }` nodes
(root is the implicit empty path). The `breadcrumb` getter prepends the synthetic
root, whose label is the **config title** (fallback `'Home'`), never a hardcoded
"Binder":

```js
get breadcrumb() {
  return [{ slug: null, title: this.config.title || 'Home' }, ...this.path];
}
```

`enter(slug, title)` drills into a child channel, but only after two guards:

```js
if (this.path.some((n) => n.slug === slug)) return; // cycle guard
if (this.path.length >= DEPTH_CAP) return;          // depth cap
```

`DEPTH_CAP` is **8** and lives in `router.js`; the cycle guard lives here in nav
resolution. A revisit of a channel already on the path, or a drill past depth 8,
is a silent no-op — no dead or cyclic affordance. `pop(toDepth)` truncates the
path to `toDepth` nodes and reloads that channel (`toDepth <= 0` returns to root).

## Connections strip and sideways jumps

Each entered channel loads a **connections strip** via `getConnections(slug)`
(`GET /channels/:slug/connections`), which returns related channels as
`{ slug, title }`. The strip is *not* a full graph map — it is a row of sideways
jumps to related channels. `#loadConnections` hides any channel already on the
current path, so the strip never offers a cyclic step:

```js
const onPath = new Set(this.path.map((n) => n.slug));
this.connections = channels.filter((c) => !onPath.has(c.slug));
```

A failed connections fetch degrades to an empty strip but is logged, so a rate-limited
429 is distinguishable from a channel that genuinely has no connections (see
[`ISSUES.md`](../../.agents/docs/ISSUES.md) I4).

**A jump is not a child.** `jump(slug, title)` starts a *fresh* breadcrumb rooted
at the target — it replaces the path rather than appending, because sideways ≠
deeper — and sets `connectionMode = true` to mark that the node was reached via a
jump. There is no separate "jumped from" crumb; `connectionMode` is the only
marker (`enter` and `loadRoot` clear it).

```js
async jump(slug, title) {
  const node = await this.#loadChannel(slug, title);
  this.path = [node];              // fresh breadcrumb rooted at the target
  this.connectionMode = true;
  await this.#loadConnections(slug);
}
```

## Landing rule

When a section opens with no specific block requested, `Nav.landing()` auto-opens
the first block that will actually paint, scanning by kind priority — Image →
Embed → Attachment → Link:

```js
for (const kind of ['image', 'embed', 'attachment', 'link']) {
  const c = this.blocks.find((b) => b.kind === kind && paints(b));
  if (c) { this.active = c; return c; }
}
this.active = null; // nothing paints → show the section index, a calm empty stage
```

A block `paints` when it is an `image` or `attachment`, an `embed` with non-empty
`embedHtml`, or a `link` whose URL is not on the framing denylist (`isDenylisted`).
A channel that is empty, drill-only, or has only denylisted links lands on its
index instead of opening a fallback card — never a blank spinner.
`openBlock(id)` sets `active` for a normal block; a `channel`-kind entry never
opens (it is a drill node).

## Hash routing by block id

Navigation is hash-routed, so it is deep-linkable and the back button replays the
stack via `onhashchange`. `router.js` encodes the drill path by **stable channel
slugs** plus an optional open **block id** — never ordinals — so a reorder in
Are.na doesn't break a shared link:

```
#reading-room/field-notes/b:47749402
   └── slugs down the path ──┘  └─ optional b:<blockId> for the open block
```

`encodePath(slugs, blockId)` joins the `DEPTH_CAP`-capped, URL-encoded slugs and
appends `b:<id>` when a block is open; `decodeHash(hash)` returns
`{ slugs, blockId }`; `navigate(slugs, blockId)` writes the hash. The app resolves
a decoded path by entering each slug in turn, then `openBlock(blockId)` if one is
present or `landing()` for an empty tail. An empty hash lands on the site: it
auto-enters the first section and calls `landing()`.

## Fetch and caching

In V3, channel **meta and contents are two separate calls** — there is no combined
response. `#loadChannel` fetches `getChannelMeta(slug)` (`GET /channels/:slug` →
`title`, `description`, `counts`) and then page 1 of `getContentsPage(slug, 1)`
(`GET /channels/:slug/contents?page=1&per=100`, already filtered to `available`
and normalized).

- **Don't fetch-all on entry.** Render page 1, then `loadMore()` appends the next
  page on demand. Pagination keys on the response `meta.has_more_pages`
  (`Nav.hasMore`), not on a raw list length that would also count non-available
  blocks. A large channel must not fire dozens of sequential calls into an API
  that publishes no readable rate budget.
- **In-session caches.** `arena.js` memoizes meta, contents pages, and connections
  in `SvelteMap`s keyed by slug (and `slug:page`), so re-entry and back-navigation
  don't refetch.
- **Rate limits.** Are.na's rate-limit headers are not browser-readable, so a 429
  triggers a fixed, escalating backoff (`backoffMs * (attempt + 1)`, up to
  `maxRetries`) rather than honoring a `Reset` header. A persistent 429 surfaces
  as `Nav.error`.

## Rendering, briefly

Each block opens into one full-viewport slot with a per-kind renderer — `Link` →
iframe, `Embed` → sandboxed `srcdoc`, `Image` → `<img>`, `Text` → sanitized
`content.html`, `Attachment` → PDF. About-HTML (a channel's `description` and the
config `about`) is sanitized on the single `Nav.about` path before any `{@html}`
sink ([`ISSUES.md`](../../.agents/docs/ISSUES.md) I1). Embedding details, the
sandbox trust boundary, and the non-iframeable fallback live in
[`embedding.md`](./embedding.md). The config shape and delivery are in
[`config.md`](./config.md).

## Caveats

- **Title quality.** `deriveTitle` can yield `'Untitled'` for a block with no
  title and no text; the numbered index and kind tag are what keep the row legible.
- **Ordinals aren't identifiers.** The numbered index reflects the channel's
  current content order, so a reorder in Are.na renumbers the display. This is
  harmless because deep-links key on block **id**, but the visible `01`, `02` are
  never stable references.
- **Third-party trust surfaces.** Framing detection is a denylist heuristic, and
  an `Embed` injects third-party HTML — both are isolated by the sandbox described
  in [`embedding.md`](./embedding.md).

A board view — an opt-in thumbnail grid for large or image-heavy channels — is a
deliberate follow-on, not part of the base navigation model.
