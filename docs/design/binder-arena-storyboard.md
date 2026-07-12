# The reader's journey through Commonplace

This is a stage-by-stage walkthrough of what a visitor experiences — from an empty
page to a block filling the screen — and which file owns each moment. Read it to map
the UX onto the code before you touch either. Commonplace is a static Svelte 5 app
rebuilt from [Binder](https://github.com/clementvalla/binder); it browses public
Are.na channels live in the browser, with no build-time content. Every claim below is
grounded in `src/` as it stands.

## The two signatures it inherits from Binder

Binder had two load-bearing moves, and Commonplace keeps both:

- **A floating, draggable box** — a monospace panel with a blue border and a stacked
  double shadow (yellow `#fefb00` at +3px over red `#ff0000` at +6px). It is the only
  chrome; everything you can do, you do from it.
- **A full-viewport background** — one content slot behind the box. Selecting a block
  swaps a per-kind renderer into that slot; the box floats over it.

Both are now theme tokens, not hardcoded colors. The defaults live in
[`src/styles/global.css`](../../src/styles/global.css) `:root` and a self-hoster can
override any of them via `config.theme` ([`src/lib/theme.js`](../../src/lib/theme.js)):

```css
--an-panel-bg: #eee;
--an-border:   blue;
--an-shadow-1: #fefb00; /* offset +3px */
--an-shadow-2: #ff0000; /* offset +6px */
--an-font:     monospace;
--an-text:     #717171;
--an-accent:   #000;    /* the active row and other highlights */
```

The active nav row highlights to `--an-accent` (black by default) — Binder's original
`.active` behavior, now driven by a variable.

## Boot → auto-enter the first channel → land on a block

[`src/App.svelte`](../../src/App.svelte)'s `onMount` runs the whole boot:

1. Resolve `config` from the URL query, apply the theme, set `document.title`.
2. `nav.loadRoot()` — resolve each configured channel's metadata into a root list of
   channel-kind entries (a failed one is kept but flagged `dead`).
3. Warm a thumbnail contact sheet for the home cover in the background.
4. **Auto-enter the first section.** If the URL hash is empty and the first section
   isn't dead, `history.replaceState` rewrites the hash to that channel's slug — so a
   first-time visitor lands *inside* a channel, faithful to Binder's "load the first
   one," and state and URL never disagree.
5. `sync()` reconciles nav to the hash, then a `hashchange` listener drives every
   navigation after this. The hash is the single source of truth.

Landing on a channel does not just open block #1. `nav.landing()`
([`src/lib/nav.svelte.js`](../../src/lib/nav.svelte.js)) opens the first block that
will *actually paint*, in this priority order:

```
Image → Embed (non-empty) → Attachment → known-framable Link
```

If nothing paints — an empty channel, drill-only, or only denylisted links — it opens
nothing and shows the numbered index over a calm empty stage. It never auto-opens a
fallback card.

```
(a) LOADING                              (b) LANDED (inside first channel)
+============================+   +==================================+
|  .------------------.      |   |                                  |
|  | Loading…         |      |   |   .--------------------------.   |
|  '------------------'      |   |   | Reading Room       – grid |   |
|   '------------------'     |   |   |..........................|   |
|    '------------------'    |   |   | 01 Intro note      [text]|   |
|                            |   |   | 02 NASA SP-2009-566 [att…]|  |
|  loadRoot(): meta per      |   |   | 03 Sunset bay     [image]|   |  <- first
|  channel; dead ones flag   |   |   | 04 Glenn Gould    [embed]|   |     paintable
|  but still list            |   |   | 05 Field Notes     >ch 12|   |     block fills
+============================+   |   '--------------------------'   |     the stage
                                 |    '--------------------------'  |
                                 |     '--------------------------' |
                                 +==================================+
```

The skeleton is a real `.at-panel .at-skeleton` box holding the frame while `booted`
is false — failure is named ("Channel unreachable: …", or a rate-limit message), never
a blank void.

## The home cover

At the root with no block open, the stage shows a `Cover`
([`src/components/Cover.svelte`](../../src/components/Cover.svelte)): a full-viewport
contact-sheet grid of the channels' block thumbnails
([`ThumbGrid`](../../src/components/ThumbGrid.svelte)), or, when nothing carries an
image, a typographic cover — title, `about`, and "Select a channel to begin." Because
boot auto-enters the first channel, a visitor usually meets the cover only by walking
the breadcrumb back to root.

## The panel

[`src/components/Panel.svelte`](../../src/components/Panel.svelte) is the draggable box.
Its header is pinned; only the body scrolls, so a long channel never runs off the
bottom of the viewport.

**Header.** A dotted CSS grip (drag affordance), the logo (only at root, if
`config.logo`), the channel/site title, then two controls pushed to the right edge:

| Control | When it shows | What it does |
|---|---|---|
| `grid` | only when `gridAvailable` (in a channel with ≥1 image thumb) | toggles the board view |
| `–` / `+` | always | minimize / maximize the body |

The body is collapsed by default on mobile (`≤768px`) and open on desktop.

**Body**, in order: the breadcrumb, the channel's `about` HTML (sanitized), any error,
the numbered nav list, a `load more…` button when more pages exist, and the
connections strip.

**The numbered index** ([`NavList`](../../src/components/NavList.svelte)) is the heart
of the box. Each row is `NN  title  tag`, zero-padded. The tag encodes what the row is:

| Tag | Meaning |
|---|---|
| `[image]` `[text]` `[embed]` `[attachment]` `[link]` | the block kind — how it will render |
| `>ch N` | a nested channel with N items — drilling in place |
| `link!` | a Link whose host is on the denylist — it will show a card, not a live frame (a pre-warning) |

Titles come from `deriveTitle` ([`src/lib/model.js`](../../src/lib/model.js)):
`title` → a Text block's first content line → a description's first line → `Untitled`.
There is no Are.na "generated title" in V3, so `Untitled` is a real possibility the
numbered index and kind tag are meant to soften.

**Dragging** ([`src/lib/drag.js`](../../src/lib/drag.js)) uses native Pointer Events
(replacing Binder's jQuery-UI + touch-punch). The header is the handle; clicks on
buttons and links are not drags; drag is disabled at `≤768px`.

## The stage: how each block kind paints

Selecting a row sets the hash to that block id, `sync()` opens it as `nav.active`, and
[`Stage.svelte`](../../src/components/Stage.svelte) routes it to a renderer. Each kind
gets a native treatment in the one full-viewport slot; there is no single universal
iframe.

| Kind | Renderer | Source field | Mechanism |
|---|---|---|---|
| Image | `ImageBlock` | `image.src` / `srcset` | native `<img>`, centered and contained |
| Text | `TextBlock` | `html` (from `content.html`) | sanitized `{@html}` in a readable column |
| Embed | `EmbedBlock` | `embedHtml` (from `embed.html`) | third-party HTML in a **sandboxed `srcdoc` iframe** (`allow-scripts allow-popups`) |
| Attachment | `AttachmentBlock` | `attachment.url` + `contentType` | PDF inlines in an iframe (desktop); video/audio play natively; else a download card |
| Link | `LinkBlock` | `link.url` | live site in a sandboxed iframe, plus an always-present "open in new tab" escape hatch |

Two subtleties worth holding:

- **Embeds are the video path.** A YouTube/Vimeo/Bandcamp item arrives from Are.na as
  an *Embed* block carrying its own `embed.html`, which plays inside the sandboxed
  `srcdoc` iframe — the sandbox is the trust boundary, so this HTML is deliberately
  *not* run through the sanitizer (that would strip the `<iframe>`/`<script>` the embed
  needs). A bare `youtube.com` watch *Link*, by contrast, is denylisted.
- **PDFs split by device.** iOS Safari can't scroll an iframed PDF, so on mobile an
  Attachment PDF degrades to a download card; on desktop it inlines (unsandboxed,
  because Chrome's PDF viewer blanks under `sandbox`, and the source is trusted
  are.na hosting).

## Non-framable links → the fallback card

A static app cannot detect an `X-Frame-Options` refusal — the iframe's `load` event
fires even on a blocked frame. So Commonplace ships a **hostname denylist**
([`src/lib/denylist.js`](../../src/lib/denylist.js)) as the decision, matched on the
exact hostname (so `docs.google.com` frames while `google.com` doesn't). It covers the
known refusers: nytimes, twitter/x, facebook, instagram, github, linkedin, reddit,
youtube.

When you open a denylisted Link, `Stage` keeps the *previously painted* content in the
background and floats a `FallbackCard` — thumbnail, provider, and "open in new tab" —
on an overlay layer. The `link!` tag in the index pre-warned this, so the card reads as
expected, not as a broken frame:

```
+================================================================+
|   .--------------------------.     [ the last block stays      |
|   | Reading Room       – grid|       painted behind the card ] |
|   |..........................|                                 |
|   | 07 NYT feature   link![*]|                                 |
|   '--------------------------'      .----------------------.   |
|    '--------------------------'     | [thumb] NYT feature  |   |
|     '--------------------------'    | nytimes.com·won't    |   |
|                                     | frame  open in tab ▸ |   |
|                                     '----------------------'   |
+================================================================+
```

For a Link that *is* framable, the live iframe fills the slot and the "open in new tab"
hatch sits quietly in a corner, growing prominent after ~2 seconds (a time-based nudge,
since there's no reliable failure signal to trigger on). See
[`embedding.md`](./embedding.md) for the full framing rationale.

## Grid / board view

The `grid` toggle appears in the header only when the current channel has loaded blocks
that carry an image (`gridAvailable` in `App.svelte`). Toggling it swaps the stage for a
full-viewport `ThumbGrid` — a contact sheet of `image.thumb` (or `image.src`) across the
channel's loaded blocks. Clicking a thumbnail opens that block and drops back to the
single view. The board is per-channel state: it resets on any drill, jump, or hash
change, so it never bleeds across channels.

## Drill, breadcrumb, and sideways jumps

The whole channel graph is one uniform tree: the synthetic root's entries are the
configured channels, and every channel's entries are its blocks plus nested-channel
drill nodes. One breadcrumb spans all of it.

**Drill in place.** Selecting a `>ch N` row navigates to `[...path, childSlug]`; the
box swaps its list for the child's blocks and the breadcrumb grows a crumb. `nav.enter`
is **cycle-guarded** (a slug already on the path is refused) and **depth-capped** at
`DEPTH_CAP = 8` ([`src/lib/router.js`](../../src/lib/router.js)), so a channel that
links back to an ancestor can't loop.

**Breadcrumb.** `[‹ Home] / Channel / Field Notes`. The first crumb is the synthetic
root ([`Breadcrumb`](../../src/components/Breadcrumb.svelte)); clicking any crumb pops
the path to that depth. The last crumb is the current node, non-clickable.

**Sideways jumps.** Below the list, the connections strip
([`ConnectionsStrip`](../../src/components/ConnectionsStrip.svelte)) shows
`<-> connected: >…` — the current channel's Are.na connections, with any channel already
on the path filtered out (no cyclic affordance). A jump is *sideways, not a child*: it
**reroots** the breadcrumb at the target rather than nesting under the current channel.

```
   click "05 Field Notes >ch 12"  ->  same box, child contents, grown crumb
        .-------------------------------.
        | ‹ Home / Reading Room / Field… |
        |...............................|
        | 01 Marginalia         [text]  |
        | 02 Sketch 04         [image]  |
        | 03 Sub-channel        >ch 3   |   <- drill again (capped at depth 8)
        |...............................|
        | <-> connected: >archive >refs |   <- jump: reroots the breadcrumb
        '-------------------------------'
         '-------------------------------'
```

Each channel is two-plus fetches — metadata, a first contents page (`per=100`), and
connections — against the Are.na **V3** REST API (`https://api.are.na/v3`), all cached
in-session ([`src/lib/arena.js`](../../src/lib/arena.js)). Long channels paginate lazily
behind `load more…` (`hasMore` from `meta.has_more_pages`). A 429 backs off on status
alone, since rate-limit headers aren't browser-readable.

## Mobile: the pinned bar

At `≤768px`, `global.css` re-pins the panel to `left/right/top: 2px` — a near-full-width
bar at the top of the screen — and drag is disabled. The body is collapsed by default,
so the bar reads as a title plus the `–/+` and `grid` controls; expanding it drops the
index down over the content. Breadcrumb, connections, drill, and the fallback card all
behave exactly as on desktop.

```
  collapsed (default):        expanded (+):
 +--------------------+      +--------------------+
 | ⋮ Field Notes  grid+|     | ⋮ Field Notes grid –|
 +--------------------+      |....................|
 |                    |      | ‹ Home / … / Field |
 |   block fills the  |      | 01 Marginalia text |
 |   full screen      |      | 02 Sketch 04  image|
 |   behind the bar   |      | 03 Sub-ch     >ch 3|
 |                    |      | <-> >archive       |
 +--------------------+      +--------------------+
```

## Related reading

- Field-by-field API mapping: [`../research/arena-v3-field-confirmation.md`](../research/arena-v3-field-confirmation.md)
- Framing / denylist design: [`./embedding.md`](./embedding.md)
- Channel-to-navigation model: [`./organizing-model.md`](./organizing-model.md)
- Build plan: [`../../.agents/docs/plans/2026-07-11-arenotebook-build.md`](../../.agents/docs/plans/2026-07-11-arenotebook-build.md)
- Known issues / audit: [`../../.agents/docs/ISSUES.md`](../../.agents/docs/ISSUES.md)
</content>
</invoke>
