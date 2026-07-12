# Binder × Are.na — wireframe-storyboard (v1)

> Resolves **"Sketch a wireframe-storyboard of the Binder × Are.na experience"** (`binder-e3d6`).
> A rough, low-fidelity artifact to *react to*, not a spec. Grounded in the real UI (`index.html`, `style.css`, `js/google-docs-site.1.0.js`) and the verified API facts (`docs/research/arena-public-api.md`).

## The direction

Three directions were explored and judged; this storyboard builds on the winner, **"Same Box, Deeper Stack"** — the most faithful and feasible skeleton — grafted with the best of the other two:

- **Spine:** keep Binder's *two* load-bearing signatures untouched — the floating, **draggable** monospace box (blue border, double shadow: yellow `#fefb00` +3px over red `#ff0000` +6px) and the **full-viewport background**. One `GET /channels/:slug` resolves everything; a **per-class renderer** swaps into the single background slot; nested channels **drill in place** with a breadcrumb.
- **Grafted from "Board & Card":** a **connections band** (channel→channel cross-links) and an **optional Board** view for large channels.
- **Grafted from "Bound Index":** the calm **numbered index** with kind-tags, an explicit **loading/resilience** state, and a **`link!`** pre-warning glyph.

One correctness note baked in: the active entry turns **BLACK** — that's the live `.active` rule in the JS. (The `.current_page_item{color:red}` rule exists in CSS but is never wired; red would be a deliberate new choice.)

## Legend (same glyphs every frame)

```
.--------.  box with BLUE border = the draggable menu     ::move:: = cursor:move drag handle
 '--------'
  '--------'   the two stacked offset edges = signature shadow (yellow +3px over red +6px)
[txt][lnk][img][vid][pdf] = block class tag, right-aligned      >ch N = nested channel (N items)
[*] = active row -> turns BLACK (live .active, not red)         #backgrnd = full-viewport slot
link!  = a Link whose site may refuse framing (pre-warning)     <-> = connections band
```

---

### Frame 1 — Landing: loading → resolved

```
(a) LOADING                                   (b) RESOLVED
+==============================+   +================================+
|                 ## LOGO ##   |   |                  ## LOGO ##    |
|   .----------------------.   |   |          pull-quotes & links, |  .about =
|   | ·············::move::|   |   |          an ongoing collection|  description
|   |......................|   |   |   .----------------------.    |
|   | ···············      |   |   |   | Reading Room ::move::|    |  header =
|   | ·········            |   |   |   |......................|    |  channel.title
|   | ················     |   |   |   | 01 Intro note   [txt]|    |
|   '----------------------'   |   |   | 02 NASA SP-2009 [pdf]|    |  nav = blocks,
|    '----------------------'  |   |   | 03 cempontra    link!|    |  numbered, by
|     '----------------------' |   |   | 04 Sunset bay   [img]|    |  generated_title
|                              |   |   | 05 Glenn Gould  [vid]|    |
|   GET /channels/reading-room |   |   | 06 Field Notes >ch 12|    |
|   ?per=100  (one fetch/load) |   |   '----------------------'    |
|   cache in-session; on fail: |   |    '----------------------'   |
|   "channel unreachable"      |   |     '----------------------'  |
|   (404 / private / offline)  |   |   [ first block auto-fills bg]|
+==============================+   +================================+
```
*One request resolves the whole site: `title`→box header, `metadata.description`→`.about`, `blocks`→a numbered index. A skeleton holds the box while it loads; failure states are named, not blank. First block auto-loads (faithful to today's "load the first one").*
**Fork A (decide in the nav-model ticket):** fold the 300px corner logo + `.about` *into* the panel header (one calm floating object) — or keep the corner wordmark. Middle option: a small monochrome mark in the header.

---

### Frame 2 — Reading the index (block variety + nesting + connections, in one box)

```
        .---------------------------------.
        | Reading Room            ::move::|
        |.................................|
        | 01 Intro note ..............[txt]|
        | 02 NASA SP-2009-566 ........[pdf]|
        | 03 cempontra ..........link![lnk]|
        | 04 Sunset over the bay .....[img]|
        | 05 Glenn Gould - Aria ......[vid]|   <- 05 active = BLACK
        | 06 Field Notes ...........>ch 12|
        |.................................|
        | <-> connected: >tools >src >zine|   connections band
        '---------------------------------'   (/channels/:slug/connections)
         '---------------------------------'
          '---------------------------------'
```
*This one frame carries the whole "richer organizing layer": **block variety** (kind tags), **nesting** (`>ch 12`), and **connections** (the `<->` band of sibling channels the block-tree would otherwise flatten away). Still `cursor:move` — draggable, just quieter.*

---

### Frame 3 — Select a Link (framing-safe) → live iframe

```
+================================================================+
|   .--------------------------.                                 |
|   | < Reading Room / 03 ::move|   +--------------------------+  |
|   |..........................|    |  cempontraoryartdaily    |  |
|   | 03 cempontra        [*]  |    |   .tumblr.com            |  |
|   | ...                      |    |  [ live site fills the   |  |
|   '--------------------------'    |    #backgrnd iframe ]    |  |
|    '--------------------------'   |                          |  |
|     '--------------------------'  +--------------------------+  |
|   iframe src = source.url · active row BLACK · breadcrumb names |
+================================================================+
```
*The classic Binder move, unchanged: `source.url` pours into the full-viewport iframe behind the box.*

---

### Frame 4 — Select a Media block → embedly player (framing-safe)

```
+================================================================+
|   .--------------------------.    +------------------------+   |
|   | Reading Room     ::move::|    |  Glenn Gould - Aria    |   |
|   |..........................|    |  YouTube (via embedly) |   |
|   | 05 Glenn Gould     [*]   |    |  [======player======]  |   |
|   | ...                      |    |   |>  0:00 / 4:12       |   |
|   '--------------------------'    +------------------------+   |
|    '--------------------------'   inject embed.html            |
|     '--------------------------'  (embedly iframe = safe;      |
|                                    sidesteps YouTube X-Frame)  |
+================================================================+
```
*A Media block injects its `embed.html`. Embedly wraps YouTube/Vimeo/Bandcamp, so they play here without tripping their own framing rules — no fallback needed.*

---

### Frame 5 — Image and Text: native renders (no iframe)

```
(a) IMAGE -> <img>                    (b) TEXT -> content_html inline
+==============================+   +==============================+
|   .------------------.       |   |   .------------------.  " Intro note        |
|   | 04 Sunset  [*]   |       |   |   | 01 Intro   [*]   |    ---------          |
|   '------------------'       |   |   '------------------'  A collection of pull |
|    '------------------'  .###.|   |    '------------------' -quotes and links,   |
|     '------------------' # img|   |                         set as running text.|
|      image.display.url  '###'|   |                        (content_html)  "     |
+==============================+   +==============================+
```
*The non-framed kinds get native treatments in the same slot: an Image paints as `<img>` from `image.display.url`; a Text block renders `content_html` inline. No iframe involved.*

---

### Frame 6 — Attachment / PDF

```
+================================================================+
|   .--------------------------.    +------------------------+   |
|   | Reading Room     ::move::|    | [] NASA-SP-2009-566.pdf|   |
|   |..........................|    |------------------------|   |
|   | 02 NASA SP-2009-566 [*]  |    |  page 1 of 148      v  |   |
|   | ...                      |    |  [ PDF renders in the  |   |
|   '--------------------------'    |    iframe / viewer ]   |   |
|    '--------------------------'   +------------------------+   |
|   attachment.url (application/pdf) -> iframe/viewer            |
+================================================================+
```
*An Attachment loads `attachment.url` in the same background slot — native browser PDF view.*

---

### Frame 7 — Non-iframeable Link → preview-card fallback

```
+================================================================+
|   .--------------------------.     [ background stays on the   |
|   | Reading Room     ::move::|       last content — this site  |
|   |..........................|       refused to be framed ]    |
|   | 07 NYT feature  link![*] |                                 |
|   '--------------------------'                                 |
|    '--------------------------'                                |
|     '--------------------------'                               |
|   .----------------------------.                               |
|   | [img] NYT feature          |  <- the ONE new element:      |
|   | nytimes.com : won't frame  |     a small preview CARD      |
|   | [ thumbnail ]   ( open ^ ) |     (image.thumb + provider   |
|   '----------------------------'      + "open in new tab")     |
+================================================================+
```
*The `link!` glyph pre-warned this in the index, so the card is a quiet, expected affordance — not a blank-frame surprise.*
**Carried risk:** browsers can't cleanly detect an X-Frame refusal (no error event). The real trigger is a **provider denylist** (NYT/Twitter/Facebook/GitHub) plus an onload-timeout heuristic. This is the substance of the embedding ticket (`binder-ab29`).

---

### Frame 8 — Drill into a nested channel + optional Board toggle

```
   click "06 Field Notes >ch 12"  ->  same box, child contents
        .-------------------------------.        [grid] toggle -> BOARD (opt-in)
        | < Reading Room / Field Notes  |     +-----------------------------+
        |...............................|     | Field Notes        [list|■] |
        | 01 Marginalia .........[txt]  |     |  +----+ +----+ +----+ +----+|
        | 02 Sketch 04 ..........[img]  |     |  |img | |img | |vid | |txt ||
        | 03 Sub-channel .......>ch 3   |     |  +----+ +----+ +----+ +----+|
        | ...                           |     |  +----+ +----+ +----+       |
        | <-> connected: >archive >refs |     |  |pdf | |img | |img |       |
        '-------------------------------'     |  +----+ +----+ +----+       |
         '-------------------------------'    +-----------------------------+
          '-------------------------------'    grid of image.thumb, for
   ( "<" or a crumb pops back out )            image-heavy / 300+ block channels
```
*Selecting a `>ch` node swaps the list for that channel's own blocks, with a growing breadcrumb; `<` pops one level. Depth is arbitrary — the channel graph decides.*
**Fork B (decide in the nav-model ticket):** offer the **Board** (spatial grid of `image.thumb`) as an *opt-in* view for large/image-heavy channels — the answer to "the small box overflows on deep/wide channels" — while keeping the iframe-as-default signature intact.
**Carried risk:** deep drilling = N more fetches; needs a spider-depth cap and a cycle guard (channels can connect back to themselves).

---

### Frame 9 — Mobile (three states)

```
  collapsed:                expanded [=]:            viewing:
 +------------------+      +------------------+      +------------------+
 | [=]     LOGO     |      | [x] Field Notes  |      | [=] < Field Notes|
 +------------------+      |..................|      +------------------+
 |                  |      | 01 Marginalia txt|      |                  |
 |   full-bleed     |      | 02 Sketch04   img|      |  block fills the |
 |   content        |      | 03 Sub-ch    >3  |      |  screen behind   |
 |  (iframe/embed/  |      | <-> >archive     |      |  the collapsed   |
 |   img/text)      |      +------------------+      |  bar             |
 +------------------+      | content behind   |      +------------------+
```
*Per the existing 768px CSS: the box pins full-width at top, the hamburger toggles the index, `.about` hides, drag disables. Breadcrumb + back share the top bar. Drill, connections, and the fallback card all still apply.*

---

## Two forks to react to

1. **Logo/about placement** (Frame 1) — fold the 300px corner logo + `.about` into the panel (one calm object) vs keep the corner wordmark vs a small monochrome header mark.
2. **Board view** (Frame 8) — add an opt-in spatial grid for large channels, or stay list-only.

Both are nav-model decisions and belong to *Design the channel-to-navigation organizing model* (`binder-7ac4`).

## Risks this storyboard carries forward (not solved here)

- **Framing detection is heuristic** — no clean browser signal for X-Frame refusal → denylist + onload-timeout. (→ `binder-ab29`)
- **Injected `embed.html` is third-party HTML** dropped into the page — a trust/XSS surface today's single-iframe design never had. (→ `binder-ab29`)
- **Deep/cyclic drill** needs a depth cap + cycle guard; each level is another fetch. (→ `binder-7ac4`)
- **`generated_title` is auto-derived** — can be "Untitled" or a mid-sentence truncation; the numbered index + kind tag soften this, but it trades the old hand-authored names for zero-maintenance sourcing.
- **Runtime dependence on the deprecated V2 API** (no rate-limit budget); the loading/failure frame names the posture but the details are open. (→ `binder-d4d4`, runtime-resilience fog)

## Alternatives explored (react by pulling a different spine)

| Direction | Score | What it argued | Fate |
|---|---|---|---|
| **Same Box, Deeper Stack** | 41/45 | Preserve both signatures; one box, one slot, per-class renderer, breadcrumb drill | **Chosen as spine** |
| **Bound Index** (reader-first) | 40/45 | Calm numbered typographic index; loading state; fold logo into panel | Legibility + loading frame **grafted in** |
| **Board & Card** (Are.na-native) | 36/45 | Spatial Board of thumbnails; explicit connections graph | Connections band + Board **grafted as options** |
