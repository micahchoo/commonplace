# Embedding & the non-iframeable fallback

Commonplace (rebuilt from [Binder](https://github.com/clementvalla/binder)) is a
static, backend-less browser app: it fetches public Are.na channels at runtime and
renders each block in the viewport. This doc explains how each block *kind* is
rendered, why Text HTML is **sanitized** while Embed HTML is **sandboxed**, and the
three-part strategy — denylist → escape hatch → fallback card — for links whose host
refuses to be framed. Read it before touching
[`src/components/renderers/`](../../src/components/renderers/),
[`src/components/Stage.svelte`](../../src/components/Stage.svelte), or the
sanitize/denylist modules.

## The constraint: a static app cannot detect a framing refusal

- A site blocks framing with **`X-Frame-Options: DENY/SAMEORIGIN`** or CSP
  **`frame-ancestors`**; the browser refuses to render and the iframe stays blank.
- **The parent can't tell.** There is no `error` event for a framing block;
  cross-origin forbids inspecting the frame; the `load` event fires *even on blocked
  frames* in Chrome — so an onload check is worthless here.
- **Nor can we pre-check headers.** A backend-less browser app can't read another
  site's response headers (`fetch` is CORS-blocked; `no-cors` returns an opaque
  response). The [evidence table](#framing-evidence) below was gathered server-side;
  the browser cannot reproduce it.

Because runtime detection is impossible, the app ships a **hostname-matched
denylist** of known refusers plus an **always-present "open in new tab ▸"** escape
hatch. No runtime detection is attempted.

## The normalized block model

Renderers never touch raw Are.na V3 JSON. `normalizeBlock()` in
[`src/lib/model.js`](../../src/lib/model.js) maps a raw V3 block to a `NormBlock`
with a `kind` discriminator (`'image' | 'text' | 'embed' | 'attachment' | 'link' |
'channel' | 'unknown'`) and a small set of per-kind fields. Every renderer and nav
node consumes `NormBlock`; the raw block survives on `block.raw`. (Are.na V3 renamed
several V2 fields — `Media`→`Embed`, `content_html`→`content.html`,
`image.display.url`→`image.large.src`; the mapping is confirmed in
[`../research/arena-v3-field-confirmation.md`](../research/arena-v3-field-confirmation.md).)

| kind | render field(s) | raw V3 source |
|---|---|---|
| `image` | `image.src`, `image.srcset`, `image.thumb`, `image.alt` | `image.large.src`, `image.{small,medium,large}`, `image.alt_text` |
| `text` | `html` (pre-sanitize) | `content.html` |
| `embed` | `embedHtml`, `embedType` | `embed.html`, `embed.type` |
| `attachment` | `attachment.{url, contentType, filename, ext}` | `attachment.{url, content_type, filename, file_extension}` |
| `link` | `link.{url, provider, title, thumb}` | `source.{url, provider.name, title}` + image thumb |

`title` is derived (`title || content.plain first line || description.plain ||
'Untitled'`) — there is **no** V3 `generated_title`. A Link whose `source.url` points
at an are.na channel normalizes to `kind:'channel'` (a drill node per the
[organizing model](./organizing-model.md)), not to a `link`.

## Per-kind render strategy

[`Stage.svelte`](../../src/components/Stage.svelte) dispatches on `block.kind` to one
renderer; any kind outside the five below (e.g. `channel`, `unknown`) falls through
to the fallback card.

| kind (renderer) | renders as | notes |
|---|---|---|
| **image** (`ImageBlock`) | native `<img>` with `src`/`srcset`/`alt` | always paints; no framing |
| **text** (`TextBlock`) | `block.html` via `{@html}`, **DOMPurify-sanitized** | user-authored; allowlist, don't hand-strip |
| **embed** (`EmbedBlock`) | **sandboxed `<iframe srcdoc={embedHtml}>`** | one path for `video` *and* `rich`; no `embedHtml` → card |
| **attachment** (`AttachmentBlock`) | `application/pdf` → iframe (desktop); `video/*` → `<video>`; `audio/*` → `<audio>`; else card | are.na-hosted, framing-safe; on mobile (`≤768px`) PDF degrades to a card — iOS Safari can't scroll an iframed PDF |
| **link** (`LinkBlock`) | iframe `block.link.url` **unless denylisted** → card | the only kind that risks a framing refusal |

## Sanitize vs sandbox: two kinds of untrusted HTML

Text and Embed both inject third-party HTML, but they need opposite treatments —
this split is the security crux.

| kind | HTML shape | isolation | why |
|---|---|---|---|
| **Text** | user-authored, raw inline HTML from markdown | **DOMPurify allowlist**, then `{@html}` | the author is a channel user; strip anything but a known-safe tag set |
| **Embed** | provider markup — a `<blockquote>` + `<script>`, or a provider `<iframe>` | **sandboxed null-origin `srcdoc` iframe**, *not* sanitized | sanitizing would strip the `<iframe>`/`<script>` the embed needs; isolate instead |

Text goes through `sanitizeHtml()` in
[`src/lib/sanitize.js`](../../src/lib/sanitize.js), which runs DOMPurify with
`USE_PROFILES: { html: true }`. Embed HTML is deliberately **never** sanitized: its
safety comes from the sandbox, which drops the framed content into an opaque origin
with no access to Commonplace's origin. Running the same DOMPurify pass over an embed
would break it by removing exactly the scripts and iframes it depends on.

### Embed — one path for video *and* rich embeds

`embed.type` is `video` (YouTube/Vimeo → an `<iframe>`) **or** `rich`
(Twitter/Instagram/etc. → a `<blockquote>` + `<script>`, with no `src` to extract).
Rather than special-case the two, `EmbedBlock` sets the whole `embedHtml` as the
`srcdoc` of one sandboxed iframe:

```svelte
<iframe
  srcdoc={embedHtml}
  sandbox="allow-scripts allow-popups"          <!-- null origin: third-party JS is isolated -->
  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"  <!-- Permissions-Policy, not a sandbox token -->
  referrerpolicy="strict-origin-when-cross-origin"
  loading="lazy"
></iframe>
```

This runs embedly/widget scripts in an isolated opaque origin (safer than
`innerHTML`), works for both embed types, and — via `allow=` — preserves
fullscreen/autoplay/DRM that a bare-`src` rebuild would have dropped. A block with no
usable `embedHtml` falls to the **fallback card**.

## Non-iframeable: denylist → escape hatch → fallback card

Three cooperating layers, no unreliable runtime probe:

**1. The denylist** ([`src/lib/denylist.js`](../../src/lib/denylist.js)) is a shipped
`Set` matched on the **exact hostname**, not the registrable domain: `docs.google.com`
frames while `google.com` search doesn't, so an eTLD+1 match can't express the
distinction. `isDenylisted(url)` returns true when `new URL(url).hostname` is in the
set. Current seeds include `nytimes.com`, `twitter.com`/`x.com`, `facebook.com`,
`instagram.com`, `github.com`, `linkedin.com`, `reddit.com`, and `youtube.com` (watch
pages refuse; embeds arrive via the `embed` kind, not `link`), each with common
`www.` variants. It's a living file — staleness is acceptable because the escape hatch
covers any miss.

**2. The escape hatch** — `LinkBlock` always renders an *"open in new tab ▸"* anchor,
which grows prominent ~2 s after the frame mounts. The nudge is **time-based**, not
`onload`-based, because `load` fires even on blocked frames. This is what recovers a
denylist *miss*: an unlisted refuser shows a blank frame, and the visible hatch is the
way out.

**3. The fallback card** ([`FallbackCard.svelte`](../../src/components/renderers/FallbackCard.svelte))
shows `link.thumb` (falling back to `image.thumb`/`image.src`), the derived `title`,
the provider name with a `· won't frame` note, and its own *"open in new tab ▸"* link
(`link.url || attachment.url`).

### How Stage wires the card in

The denylist decision lives in [`Stage.svelte`](../../src/components/Stage.svelte),
not in `LinkBlock` — `LinkBlock` stays a pure framing renderer. Stage computes
`cardOnly = block.kind === 'link' && isDenylisted(block.link?.url)` and, when true,
layers the UI in two:

- the **content layer** keeps painting the *last non-overlay* block (`lastInline`),
  so the previous view stays behind the card rather than flashing to white;
- the **overlay layer** paints the `FallbackCard` on top (pointer-events only on the
  card itself).

So a denylisted Link never mounts an iframe at all — it goes straight to the card over
the retained background.

## Framing evidence

Framing behavior was observed server-side (the browser cannot check these headers at
runtime). This is what seeds the denylist and justifies default-allow-then-deny.

| Host | Frames? | Header |
|---|---|---|
| Google Docs (`/document/d/…`), Tumblr, `youtube.com/embed/…`, Wikipedia | **yes** | none |
| `cdn.embedly.com/widgets/…` (Embed blocks) | **yes** | none (embeds by design) |
| `attachments.are.na/….pdf` | **yes** | none, and no `Content-Disposition` → inlines on desktop |
| nytimes.com · twitter.com · facebook.com | **no** | `X-Frame-Options: DENY` |
| github.com | **no** | `X-Frame-Options: deny` + CSP `frame-ancestors 'none'` |

A Link block's `source.url` is the *canonical* page (a `youtube.com/watch`, a news
article, a `docs.google.com/…/edit`), which for big platforms usually refuses — so the
fallback card is the common outcome for social/news/platform links, and framing is for
the long tail (blogs, personal sites, docs, wikis). Default-allow-then-deny is still
right because that long tail frames.

## Sandbox tokens per class

| class | sandbox | rationale |
|---|---|---|
| **Embed** | `allow-scripts allow-popups` (on `srcdoc`) | null/opaque origin isolates third-party JS from Commonplace |
| **Link** | `allow-scripts allow-same-origin allow-popups allow-forms`; **no** `allow-top-navigation` | framed content is cross-origin, so `allow-same-origin` grants it *its own* origin's rights, never Commonplace's; omitting top-navigation blocks redirect-hijack |
| **Attachment PDF** | *unsandboxed* | are.na-hosted and trusted; Chrome's PDF viewer blanks under `sandbox` |
| **Text** | n/a | DOMPurify allowlist before `{@html}` |

Both iframes carry `referrerpolicy="strict-origin-when-cross-origin"` (privacy without
breaking referer-gated embeds like domain-locked Vimeo) and `loading="lazy"`. Some
sites break under sandbox — the escape hatch covers them, and the sandbox set is
tunable.

## Interaction with the organizing model's landing

The [organizing model](./organizing-model.md)'s "auto-open the first *renderable*
block" rule must prefer a block that will *actually paint*: Image and Text always
render, Embed usually does, but a first **Link may be denylisted → a card**. So the
opening block is biased toward Image / Embed / Attachment / a non-denylisted Link;
if the only candidates fall back, the app shows the section index rather than opening
on a card.

## Design boundaries

- **Denylist staleness** — an unlisted refuser shows a blank frame until the user hits
  the escape hatch. Accepted.
- **A CORS-proxy header check** could detect refusals at runtime but adds a
  backend/third-party dependency — rejected under the static/no-secrets constraint; an
  optional power-user toggle at most.
- **Sandbox breaks some legitimate sites** — the escape hatch covers them; the sandbox
  set is tunable.
- **Mobile PDF** — no inline view; download/open-in-tab is the honest answer.
