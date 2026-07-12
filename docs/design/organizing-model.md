# Binder × Are.na — the organizing model (decided)

> **API version:** the project builds on **Are.na V3** (`docs/research/arena-api-v3.md`). Field names below are V2-verified — translate them per that doc's V2→V3 mapping during implementation (the *logic* is unchanged; `Media`→`Embed`, `content_html`→`content.html`, etc.).

> Resolves **"Design the channel-to-navigation organizing model"** (`binder-7ac4`).
> Builds on the storyboard (`docs/design/binder-arena-storyboard.md`) and the API research
> (`docs/research/arena-public-api.md`). Forks settled by grilling, then adversarially
> stress-tested and corrected, on 2026-07-11.

## The model in one picture

```
SITE (config: title/about + ordered channel slugs)
│
├─ Section A  (Are.na channel)  ─────────────┐  each section is a channel:
│    ├─ 01 block ....[txt]                    │   • blocks (contents, state=available) = ordered entries
│    ├─ 02 block ....[pdf]                    │     by `position`, labelled `generated_title`, tagged `class`
│    ├─ 03 sub-channel .....>ch 8  ── drill ──┼─▶ • a Channel block in contents = a nested drill node
│    └─ <-> connected: >x >y      ── jump ────┘   • connections strip (/connections) = sideways jumps
│
├─ Section B  (Are.na channel)   …
└─ Section C  (Are.na channel)   …
```

The **root** is a synthetic "site" node whose entries are the configured section channels.
Below it everything is **uniform**: a channel holds ordered blocks + nested Channel drill-nodes,
with a connections strip — the same shape at every depth. One breadcrumb spans the tree.

## Decisions

| Question | Decision |
|---|---|
| **Root scope** | **Several top-level channels** = the site's *sections*. Config supplies an ordered list of channel slugs + optional site title/about. (Faithful to Binder's original multi-entry menu — each entry is now a channel.) |
| **What is a nav entry** | Inside a channel: each **block** in `contents` with `state == "available"`, in `position` order, labelled by `generated_title`, tagged by `class`. A **Channel block** (`base_class: Channel`) in that same `contents` is a **drill node**. The **root** is a synthetic channel whose entries are the section channels — uniform top to bottom. |
| **Connections** | **Nested + a connections strip** at each channel level, from `GET /channels/:slug/connections` (items carry `slug` — navigable). Sideways jumps to related channels. *Not* a full graph map. |
| **Rendering** | One full-viewport slot, **per-class renderer**: Link→iframe `source.url`, Media→sandboxed `srcdoc` embed, Image→`<img>`, Text→sanitized `content_html`, Attachment→PDF. **Embedding details + the non-iframeable fallback: `docs/design/embedding.md`.** |
| **Drill** | Breadcrumb, depth **capped at 8**, with a **cycle guard** (skip any channel id already on the path). |
| **Signature UX** | Preserve the draggable box-shadow panel + full-viewport slot; **fold the logo + about into the panel header**; active row is **black** (live `.active`). |
| **Board view** | **Deferred** — an opt-in thumbnail grid for large/image-heavy channels, a follow-on. |

## Navigation & levels

1. **Root (the site).** Header shows the config `title`/`about`; entries are the section channels as drill nodes. Breadcrumb root label = the **config title** (not a hardcoded "Binder").
2. **A section (a channel).** Header swaps to that channel's `title` / `metadata.description`; entries are its `available` blocks + nested channels + the connections strip. Breadcrumb `‹ <Site> / Section A`.
3. **Deeper.** Same shape; breadcrumb grows; `‹` pops one level; depth-capped, cycle-guarded.

```
ROOT (site)                         INSIDE Section A
.----------------------.            .----------------------------.
| My Binder    ::move::|            | ‹ My Binder / Reading Room |
|......................|            |............................|
| > Reading Room  >ch  |            | 01 Intro note .......[txt] |
| > Field Work    >ch  |   drill    | 02 NASA SP-2009 .....[pdf] |
| > Ephemera      >ch  |  ───────▶  | 03 cempontra ....link![lnk]|
'----------------------'            | 04 Field Notes ......>ch 12|
 '----------------------'           | <-> connected: >src >zine  |
  '----------------------'          '----------------------------'
 header = config title/about        header = channel title/about
```

## Routing & addressability (preserve today's hash-routing)

Today Binder is hash-routed (`window.onhashchange`; deep-linkable, back-button works). Keep that:

- **The hash encodes the drill path by stable ids**, not ordinals — e.g. `#reading-room/field-notes/b:47749402` (channel slugs down the path, optional `b:<blockId>` for the open block). Ordinals (`01`) are **display only**; deep-links use block **id** so a reorder in Are.na doesn't break shared links.
- **Landing defers to the incoming hash.** With a hash present, resolve straight to that path. With an empty hash, auto-enter the **first section** and open its first **renderable** block (prefer a class that actually paints — Image/Media/Attachment or a known-framable Link — over one that would open on a fallback card; if the section is empty or has only drill-nodes, show the section index with a calm empty stage, never a blank spinner). *(Binder's "load the first one," adapted — not a claim that the first thing is always a full site behind the box; see `docs/design/embedding.md`.)*
- **A connection jump starts a fresh breadcrumb rooted at the target** channel (an explicit "jumped from" crumb optional) — it does *not* append, because sideways ≠ child. The strip **hides** any channel already on the current path (no dead/cyclic affordance).
- **Back button** replays the hash stack via `onhashchange`.

The detailed encoding is refined during the codebase migration; the *shape* above is the decision.

## Runtime & fetch strategy

- `GET /channels/:slug?per=100` returns channel **meta + the first page of `contents`** — there is *no* meta-only call, so the first 100 blocks arrive with the meta. **Reuse that first page** as the section's page 1; don't refetch on entry.
- **Do not fetch-all on entry.** Render page 1, then **lazy-load more** on demand ("load more" / scroll) — a 3000-block channel must not fire 30 sequential calls into an API that publishes no rate budget. Keep a list render cap regardless (the deferred Board is the eventual answer for huge channels).
- **Filter to `state == "available"` before numbering**, and paginate on an observed short page — not on raw `length` (which counts non-available blocks), so numbering and page math stay consistent.
- **Root fetches N section metas** (one page each). **Degrade per section:** render every reachable section; mark a dead one (404 / private — recall *closed* is still readable, only *private* fails); never abort the whole site for one bad slug.
- Cache resolved channels in-session.

## Data → model mapping (grounded in the verified API)

| Are.na | Binder role | Source |
|---|---|---|
| config channel slugs (ordered) | the top-level **sections** | config |
| `channel.title` / `metadata.description` | section header; site header comes from config | in the `GET /channels/:slug` response |
| `block` in `contents`, `state==available`, `position` order | a nav **entry**; `generated_title`→label; `class`→tag + renderer | first page free with the channel fetch; lazy for more |
| `Channel` block (`base_class: Channel`) in `contents` | a **drill node** | same `contents` |
| `GET /channels/:slug/connections` (`channels[]`, each with `slug`) | the **connections strip** | separate fetch |

**Are.na-URL Links normalize to drill:** a Link block whose `source.url` points at an are.na channel is detected and treated as a nested drill (are.na sends `X-Frame-Options`, so framing it would fail anyway) — same destination, one behavior.

## What this graduates

- **Self-hosting config is now specifiable** → new ticket. The site = "title/about + ordered channel slugs," so the config **shape + delivery** (fetched `config.json` vs `?channels=` params) + theming is sharp — and it's a **breaking change** from today's `info.json` name→URL `menu`, so migration must be part of it.
- **Board view** stays deferred (a follow-on once the base nav ships). → fog.

## Open risks carried forward

- Runtime dependence on the **deprecated V2 API** (`binder-d4d4`); **framing detection** is heuristic (`binder-ab29`); injected `embed.html` is a third-party-HTML trust surface (`binder-ab29`).
- **`generated_title` quality** — can be "Untitled" or truncated; the numbered index + class tag soften it; the self-hoster trades hand-authored names for zero-maintenance sourcing.
- **Reorders renumber** the display index (numbering is by `position`); harmless because deep-links key on block id, but the visible ordinals are not stable identifiers.

## Alternative left on the table

Presenting sections as a **grouped accordion** (expand in place to reveal blocks) instead of drill-in nodes — a nicer top-level feel at the cost of a second interaction pattern. Defaulted to uniform drill for coherence; easy to revisit.
