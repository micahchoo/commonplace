# Binder × Are.na — embedding & the non-iframeable fallback (decided)

> **API version:** the project builds on **Are.na V3** (`docs/research/arena-api-v3.md`). Field names below are V2-verified — translate per that doc's V2→V3 mapping (`embed.html` and `attachment.url` are unchanged; `Media`→`Embed`, `content_html`→`content.html`, `image.display.url`→`image.large`).

> Resolves **"Decide per-block embedding and the non-iframeable fallback"** (`binder-ab29`).
> Grounded in empirical framing/attachment-header probes (2026-07-11), MDN (`X-Frame-Options`,
> CSP `frame-ancestors`, iframe `sandbox`/`allow`), and the organizing model
> (`docs/design/organizing-model.md`). Grilled inputs, then adversarially hardened.

## The crux: a static app cannot detect (or pre-check) a framing refusal

- A site blocks framing with **`X-Frame-Options: DENY/SAMEORIGIN`** or CSP **`frame-ancestors`**; the browser refuses to render and the iframe stays blank.
- **The parent can't tell.** There is no `error` event for a framing block; cross-origin forbids inspecting the frame; the `load` event fires *even on blocked frames* in Chrome — so an onload check is worthless for this.
- **Nor can we pre-check headers.** A backend-less browser app can't read another site's response headers (`fetch` is CORS-blocked, or `no-cors` → opaque). The header table below only worked **server-side**; the browser cannot do it.

**⇒ Decision:** a **shipped, hostname-matched denylist** of known refusers + an **always-present "open in new tab ▸"** escape hatch. No runtime detection is attempted, because none is reliable.

## Framing headers, empirically (probed 2026-07-11, server-side)

| Host | Frames? | Header |
|---|---|---|
| Google Docs (`/document/d/…`), Tumblr, `youtube.com/embed/…`, Wikipedia | **yes** | none |
| `cdn.embedly.com/widgets/…` (Media embeds) | **yes** | none (embeds by design) |
| `attachments.are.na/…​.pdf` | **yes** | none — and no `Content-Disposition`, so inline (desktop) |
| nytimes.com · twitter.com · facebook.com | **no** | `X-Frame-Options: DENY` |
| github.com | **no** | `X-Frame-Options: deny` + CSP `frame-ancestors 'none'` |

Every README "can't-frame" site is header-verified. **But note:** a Link block's `source.url` is the *canonical* page (a `youtube.com/watch`, a news article, a `docs.google.com/…/edit`), which for big platforms usually refuses — so **the fallback card is the common outcome for social/news/platform links**, and framing is for the long tail (blogs, personal sites, docs, wikis). Default-allow-then-deny is still right because that long tail frames.

## Per-class render strategy

| class | Renderer | Notes |
|---|---|---|
| **Image** | native `<img>` (`image.display.url` + `srcset` with thumb/original) | always renders; no framing |
| **Text** | `content_html` inline, sanitized with an **allowlist sanitizer (DOMPurify)** | Text is user-authored and markdown often passes raw inline HTML — allowlist, don't hand-strip |
| **Media** | a **sandboxed `<iframe srcdoc="{embed.html}">`** (see below) | one path for both `embed.type` = `video` *and* `rich` |
| **Attachment** | `application/pdf` → iframe on **desktop**, download/open-in-tab card on **mobile**; `video/*`→`<video>`, `audio/*`→`<audio>`; else download card | attachments.are.na verified framing-safe + inline; iOS Safari can't scroll an iframed PDF |
| **Link** | iframe `source.url` **unless the host is denylisted** → then the fallback card | the only class that risks a refusal; `are.na` channel URLs normalize to a drill (per the organizing model) |

### Media — one path for video *and* rich embeds

`embed.type` is `video` (YouTube/Vimeo → an `<iframe>`) **or** `rich` (Twitter/Instagram/etc. → a `<blockquote>` + `<script>`, *no* iframe `src` to extract). So don't extract a `src` — **set the whole `embed.html` as the `srcdoc` of one sandboxed iframe**:

```
<iframe srcdoc="{sanitized embed.html}"
        sandbox="allow-scripts allow-popups"          ← null-origin: third-party JS is isolated from Binder
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"  ← Permissions-Policy (NOT a sandbox token;
        referrerpolicy="strict-origin-when-cross-origin"                     allow-presentation ≠ fullscreen)
        loading="lazy"></iframe>
```

This runs embedly/widget scripts in an isolated opaque origin (safer than `innerHTML`), works for both embed types, and — via `allow=` — preserves fullscreen/autoplay/DRM that a bare-`src` rebuild would have dropped. If a Media block has no usable `embed.html`, it falls to the **card**.

## Non-iframeable detection & fallback

Two layers — no unreliable third:

1. **A shipped denylist, matched on full hostname** (not registrable domain — `docs.google.com` frames while `google.com` search doesn't, so eTLD+1 can't express it). Seeded from the evidence: `nytimes.com`, `twitter.com`/`x.com`, `www.facebook.com`, `instagram.com`, `github.com`, `www.linkedin.com`, `reddit.com`, `youtube.com` (watch pages refuse; embeds arrive via Media, not Link), … A living file shipped in the app. A denylisted Link goes straight to the card.
2. **An always-present escape hatch** — every Link view carries *"open in new tab ▸"*, made more prominent a couple of seconds in (a **time-based** nudge — not `onload`-based, since `load` fires on blocked frames). This is what covers a denylist *miss*: an unlisted refuser shows a blank frame, and the visible escape hatch is the recovery.

**The fallback card** (storyboard Frame 7): `image.thumb` + `source.provider.name` + `generated_title` + *"open in new tab ▸"*. Shown when the host is denylisted or the user invokes it.

## Security — injected third-party content

- **Link iframes:** `sandbox` **without `allow-top-navigation`** (blocks redirect-hijack), with `allow-scripts allow-same-origin allow-popups allow-forms`; `referrerpolicy="strict-origin-when-cross-origin"` (privacy without breaking referer-gated embeds like domain-locked Vimeo); `loading="lazy"`. Some sites break under sandbox → the escape hatch covers them. *(The `allow-scripts`+`allow-same-origin` pair is safe here because framed content is cross-origin — it gets its own origin's rights, never Binder's.)*
- **Media:** the `srcdoc` + `sandbox` above isolates third-party scripts in a null origin.
- **Attachment PDF iframe:** **not** sandboxed (are.na-hosted, trusted; Chrome's PDF viewer can blank under `sandbox`).
- **Text:** DOMPurify allowlist before insertion.

## Interaction with the organizing model's landing

"Auto-open the first *renderable* block, preferring a framed class" must prefer a class that will *actually paint*: Image/Text always render; Media usually; a first **Link may be denylisted → a card**. So bias the opening block toward Image/Media/Attachment/known-framable-Link, and if the only candidates fall back, show the section index rather than open on a card. (Reconciled into `organizing-model.md`.)

## What this hands on / leaves open

- The **denylist is a living file** shipped in-app (not a ticket) — staleness is covered by the escape hatch.
- A **CORS-proxy header check** could detect refusals at runtime but adds a backend/third-party dependency — **rejected** under the static/no-secrets constraint; an optional power-user toggle at most.
- DOMPurify + the sandbox/`allow` wiring are implementation concerns riding on the **framework choice** (`binder-c14b`).

## Risks

- Denylist staleness — an unlisted refuser shows a blank frame until the user hits the escape hatch. Acceptable.
- Sandbox breaks some legitimate sites — escape hatch covers them; the sandbox set is tunable.
- Mobile PDF — no inline view; download/open-in-tab is the honest answer.
