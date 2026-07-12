# AreNotebook Build — Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Binder as **AreNotebook** — a self-hostable, 100%-static SPA that fetches Are.na *public* channels at runtime and renders them as a navigable, nested menu over a full-viewport content slot, preserving the signature draggable box aesthetic.

**Architecture:** Svelte 5 (runes) + Vite emit a static `dist/` (no server, no secrets). A thin adapter (`src/lib/arena.js`) is the *only* code that touches the Are.na V3 REST API; it normalizes raw V3 blocks into one internal `NormBlock` shape (`src/lib/model.js`) that every nav node and renderer consumes. Nav state (path / breadcrumb / drill) lives in runes (`src/lib/nav.svelte.js`); hash routing deep-links by stable block id. A per-kind renderer paints into a single full-viewport slot. Build proceeds as a **walking skeleton** (Wave 1 = end-to-end vertical slice through the real API) then deepens each axis.

**Tech Stack:** Svelte 5 runes · Vite · Vitest + jsdom (unit) · DOMPurify 3.x · native Pointer Events · `onhashchange`. Drop jQuery / jQuery-UI / touch-punch / modernizr / legacy GA.

---

## Decision Reference (adapted Q-N)

This repo's decision record is the **seeds map + `docs/design/*`**, not `docs/decisions/<scope>.md`. Per the writing-plans Q-N convention, constraints are cited by stable handle — here the resolving **seeds ticket id + design doc**. Summary table at the end (§Decision-Reference Summary).

| Ref | Decision | Doc |
|---|---|---|
| `binder-d4d4` | Build on Are.na **V3**; V2→V3 field map; rate limits (guest 30/min) | `docs/research/arena-api-v3.md` |
| `binder-7ac4` | Organizing model: sections → blocks + drill + connections; hash-routing by block id; no fetch-all | `docs/design/organizing-model.md` |
| `binder-ab29` | Per-kind renderers; hostname denylist + escape hatch + fallback card; sandbox/DOMPurify | `docs/design/embedding.md` |
| `binder-c14b` | Svelte 5 + Vite static SPA; Svelte gotchas (`{@html}` global styles, `SvelteMap`, hand-rolled routing) | `docs/design/framework.md` |
| `binder-5299` | `config.json` + `?channel=` override; signature-default tokenized theming | `docs/design/config.md` |
| `binder-e3d6` | UX storyboard ("Same Box, Deeper Stack"); active row black; retain-behind-card fallback | `docs/design/binder-arena-storyboard.md` |
| `binder-c8c3` | Name = **AreNotebook** (trademark caveat, sanity-check before rebrand) | `docs/design/name.md` |

---

## Assumptions (verify at each review gate — stale assumptions are the #1 rework cause)

1. **V3 response shapes — CONFIRMED live (Task 0 done, 2026-07-11 → `docs/research/arena-v3-field-confirmation.md`).** Discriminator is `type` (Channel has no `base_type`); availability filter is `state == "available"` (V2 filter survives); image is `image.src` **plus** resized variants `image.{small,medium,large}.{src,src_2x}` (srcset supported); Text `title` is null → derive from `content.plain`; channel/section header is top-level `description.{html,plain}` (**not** `metadata.description`); Channel blocks + connections carry `slug` + `counts.contents` directly; pagination on `meta.has_more_pages`. Channel meta and contents are **two separate calls** (`GET /v3/channels/:slug` then `.../contents`).
2. **V3 public reads are CORS `*`, no auth** (verified `binder-d4d4`) — so browser `fetch` needs no proxy.
3. Vite + `@sveltejs/vite-plugin-svelte` emit a fully static SPA. **`vite.config.js` sets `base: './'`** so content-hashed assets resolve under subpath hosting (GitHub Pages project pages) and `file://`.
4. **DOMPurify sanitizes only Text `content.html`.** Embed `embed.html` is **NOT** DOMPurify'd — its isolation comes from the **sandboxed null-origin iframe** (`srcdoc`); running it through default DOMPurify would strip the very `<iframe>`/`<script>` the embed needs and render every embed blank. (Corrects the earlier plan draft; aligns with `embedding.md` §Media, which specifies sandbox isolation, not sanitization, for embeds.)
5. Node ≥ 18 + npm available; Vitest runs with `environment: 'jsdom'` (DOMPurify needs a DOM).
6. The signature CSS values (`#fefb00`/`#ff0000` shadow, `blue` border, `#eee` bg, `monospace`, `#000` active) are the tokenized defaults (from `style.css` + `docs/design/config.md`), shipped in `global.css` from Wave 1.
7. **`X-RateLimit-*` are unreadable in-browser — CONFIRMED (Task 0).** `Access-Control-Expose-Headers` is empty and no `Retry-After` is sent, so `response.headers.get('X-RateLimit-Reset')` returns `null` cross-origin. **Task 22 backs off on the `429` status alone** — no header refinement is possible. (`arena-api-v3.md` §Rate limits now carries the correction — see §Escalations E-1.) CORS itself is confirmed working: `ACAO: *` with an `Origin` header, so browser fetch needs no proxy.

---

## File Structure

**Created (new app):**
- `package.json`, `vite.config.js` (`base:'./'`), `vitest.config.js` (`environment:'jsdom'`) — build/test config
- `index.html` (root, Vite entry) — replaces the legacy `index.html`; mounts the app
- `src/main.js` — `import './styles/global.css'` + `mount(App, { target })`
- `src/App.svelte` — boot: resolve config → apply theme → set `document.title` → own nav state → render Panel + Stage
- `src/lib/model.js` — `NormBlock` shape + `normalizeBlock` / `deriveTitle` / `blockKind` / `isArenaChannelLink` / `extractSlug` (**the contract**) — plain `.js` (no runes)
- `src/lib/arena.js` — V3 adapter: `getChannelMeta`, `getContentsPage`, `getConnections`, `SvelteMap` cache, 429 backoff — plain `.js` (`SvelteMap` is an ordinary import)
- `src/lib/config.js` — resolve `?channel(s)=` → `config.json` → empty state; slug extraction — plain `.js`
- `src/lib/theme.js` — token defaults + `applyTheme(theme)` with shape validation + key→CSS-var mapping — plain `.js`
- `src/lib/router.js` — hash `encodePath` / `decodeHash` / `onHash`; depth cap — plain `.js` (pure fns + `onhashchange` wrapper)
- `src/lib/nav.svelte.js` — nav state machine (**runes → must be `.svelte.js`**): path, resolved channels, breadcrumb, active block, drill, cycle guard, landing; reactive fields exposed via **getters** (not a plain property bag)
- `src/lib/denylist.js` — hostname denylist + `isDenylisted(url)` — plain `.js`
- `src/lib/drag.js` — `use:drag` Svelte action (Pointer Events; `touch-action:none`; 768px disable; `li` cancel)
- `src/components/Panel.svelte` — draggable box: **per-level header** (root = config title/about; inside a channel = that channel's title/description), breadcrumb, NavList, ConnectionsStrip, mobile hamburger
- `src/components/NavList.svelte`, `Breadcrumb.svelte`, `ConnectionsStrip.svelte`, `EmptyState.svelte`
- `src/components/Stage.svelte` — full-viewport slot; **two layers** (content layer + overlay layer) so a FallbackCard can overlay *retained* prior content (storyboard Frame 7); dispatch by `kind`, `unknown`→FallbackCard
- `src/components/renderers/{ImageBlock,TextBlock,EmbedBlock,AttachmentBlock,LinkBlock,FallbackCard}.svelte`
- `src/styles/global.css` — CSS custom-property tokens (signature defaults on `:root`) + styles for `{@html}` content (Text, embed) — **global** because scoped styles don't reach `{@html}`; **created in Task 1, imported by `main.js`**
- `config.json` — sample self-host config (replaces `info.json`)
- `test/fixtures/v3-*.json` — captured live V3 responses (from the spike) as test fixtures

**Modified / removed (legacy):**
- Remove: `js/google-docs-site.1.0.js`, `js/vendor/*` (jQuery, jQuery-UI, touch-punch, modernizr), the legacy root `index.html` markup + GA snippet, `info.json`
- Rewrite: `README.md` (rebrand + migration + rate-limit note), assets (`logo.png`/favicon/`binder-clip.png` as-is unless rebranded)

---

## Wave 0 — Foundation & contracts

### Task 0: Confirm live V3 response shapes `[SPIKE]`

**Orient:** The design docs specify logic against V2 field names; freezing the `NormBlock` contract on unconfirmed V3 shapes would inject field bugs through every renderer — confirm the real shapes first.
**Flow position:** Gates **Task 2 (model)** and **Task 3 (adapter)**; nothing consumes an unconfirmed contract. (Task 1, the scaffold, does not depend on this.)
**Skill:** `hybrid-research`
**Files:**
- Create: `test/fixtures/v3-channel.json`, `v3-contents.json`, `v3-connections.json` (captured responses)
- Create: `docs/research/arena-v3-field-confirmation.md` (the answer)

- [ ] **Step 1:** Probe the live V3 API for a known public channel with mixed block kinds. `curl`/`wget` are blocked in this env → use `mcp__plugin_context-mode_context-mode__ctx_execute` (python `urllib`). Fetch `GET https://api.are.na/v3/channels/:slug`, `.../contents?per=100`, `.../connections`.
- [ ] **Step 2:** Confirm and record: (a) the **Image URL fields** (`image.large`? + a thumb URL for `srcset`); (b) the field marking a block/connection **renderable/available** (V2 `state=="available"` → V3 equivalent, e.g. `visibility` or a `connection` field); (c) `Embed`/`Link`/`Attachment`/`Text` nesting (`embed.html`, `source.url`+`provider`, `attachment.url`+`content_type`+`filename`, `content.html`); (d) pagination `meta` keys (`has_more_pages`/`next_page`); (e) `type`+`base_type` discriminate all six kinds; (f) a **Channel block's item-count field** (for `>ch N` — `counts.contents`?); (g) the **`/connections` item shape** — does each item expose a channel `slug` directly, or only a URL needing `extractSlug`?
- [ ] **Step 3:** **Browser-header check (critical):** determine whether `X-RateLimit-*` / `Retry-After` are readable from client JS — inspect the response for `Access-Control-Expose-Headers`, or run a tiny in-browser `fetch` (dev console) and check `response.headers.get('X-RateLimit-Reset')`. Record readable / not-readable — this decides Task 22's mechanism.
- [ ] **Step 4:** Save raw responses as fixtures; write `arena-v3-field-confirmation.md` as a field table the model/adapter code against; note any divergence from `arena-api-v3.md` as an **answer-back** row (including the header-readability finding).

**Run:** manual — spike verified by the written field table + saved fixtures.
**Expected:** `docs/research/arena-v3-field-confirmation.md` names the exact JSON path for every field `model.js`/`arena.js` read, the connections item shape, the Channel-count field, and whether rate-limit headers are browser-readable; three fixture files exist.

### Task 1: Scaffold Svelte 5 + Vite + Vitest + global stylesheet

**Orient:** Everything downstream needs a buildable, testable app skeleton that emits static output and loads the signature tokens.
**Flow position:** Root of the DAG; all tasks depend on it.
**Skill:** `none`
**Files:**
- Create: `package.json`, `vite.config.js`, `vitest.config.js`, `index.html`, `src/main.js`, `src/App.svelte` (stub), `src/styles/global.css`

- [ ] **Step 1:** Add deps: `svelte`, `@sveltejs/vite-plugin-svelte`, `vite`, `vitest`, `jsdom`, `dompurify`, `svelte-check` (pin versions). `vite.config.js` → `plugins: [svelte()], base: './'`. `vitest.config.js` → `test: { environment: 'jsdom' }`.
- [ ] **Step 2:** Root `index.html` with `<div id="app">` + `<script type="module" src="/src/main.js">` + favicon link. `src/main.js` → `import './styles/global.css'; import { mount } from 'svelte'; import App from './App.svelte'; mount(App, { target: document.getElementById('app') })`.
- [ ] **Step 3:** `src/styles/global.css` `:root` with the signature token defaults: `--an-panel-bg:#eee; --an-border:blue; --an-shadow-1:#fefb00; --an-shadow-2:#ff0000; --an-font:monospace; --an-text:#717171; --an-accent:#000;`. `App.svelte` renders a placeholder.
- [ ] **Step 4:** Add scripts: `dev`, `build`, `preview`, `test` (vitest run), `check` (svelte-check).
- [ ] **Step 5 (Verify):** **Run:** `npm install && npm run build && npm test`. **Expected:** `dist/index.html` + hashed assets (relative paths) produced; vitest runs under jsdom (0 tests, exit 0).
- [ ] **Step 6:** Commit.

### Task 2: Normalized block model + V3 normalizers (the contract)

**Orient:** One internal `NormBlock` shape decouples every renderer and nav node from raw V3 JSON — the single most-consumed contract in the app.
**Flow position:** Wave 0 → consumed by adapter (T3), renderers (Wave 2), nav (Wave 3). **Depends on Task 0 (confirmed fields) and Task 1 (test harness).**
**Downstream contract:** Produces `NormBlock` for adapter + renderers + nav.
**Skill:** `tdd`
**Files:**
- Create: `src/lib/model.js`, `test/model.test.js`

<contracts>
**Downstream (`model` → adapter/renderers/nav):**
```
NormBlock = {
  id: number,                 // stable block id → hash `b:<id>`
  kind: 'image'|'text'|'embed'|'attachment'|'link'|'channel'|'unknown',
  title: string,              // deriveTitle: title || description || 'Untitled'
  image?:      { src, thumb?, alt },     // src + thumb feed <img srcset>
  html?:       string,        // text: content.html (pre-sanitize)
  embedHtml?:  string,        // embed.html (NOT sanitized — sandbox isolates)
  link?:       { url, provider?, title?, thumb? },
  attachment?: { url, contentType, filename, ext },
  channelSlug?: string,       // kind==='channel' (native Channel OR are.na-link normalized to drill)
  count?: number,             // kind==='channel': item count for `>ch N`
  raw: object                 // escape hatch
}
normalizeBlock(v3block): NormBlock
deriveTitle(v3block): string
blockKind(v3block): NormBlock['kind']
isArenaChannelLink(url): boolean
extractSlug(urlOrSlug): string
```
Invariant: `normalizeBlock` never throws on a missing field — unknown/empty → `kind:'unknown'` with a title, never `undefined`.
</contracts>

- [ ] **Step 1:** Write failing tests against the Task 0 fixtures: each of the six V3 `type`s → correct `kind`; `deriveTitle` falls through `title→description→'Untitled'`; a `Link` whose `source.url` is an are.na channel → `kind:'channel'` + `channelSlug`; a Channel block → `count` populated; `extractSlug('https://www.are.na/x/my-slug')==='my-slug'`; a malformed block → `kind:'unknown'`, no throw.
- [ ] **Step 2:** **Run:** `npm test -- model` → FAIL (module absent).
- [ ] **Step 3:** Implement `model.js` using the **confirmed** field paths from Task 0 (not the V2 names).
- [ ] **Step 4:** **Run:** `npm test -- model` → PASS.
- [ ] **Step 5:** Commit.

---

## Wave 1 — Walking skeleton (end-to-end vertical slice)

*Goal of the wave: a running app that loads one real public channel, lists its blocks, and opens one in the slot with a working deep-link. Proves the whole pipeline before deepening any axis.*

### Task 3: Are.na V3 adapter (fetch + cache)

**Orient:** The one seam to the network; isolating it keeps V3's shape in a single file and makes the rest testable with fixtures.
**Flow position:** `model` → **adapter** → `nav`. Wave 1.
**Upstream contract:** consumes V3 JSON; produces `NormBlock[]` + channel meta.
**Skill:** `tdd`
**Files:**
- Create: `src/lib/arena.js`, `test/arena.test.js`

<contracts>
```
getChannelMeta(slug): Promise<{ slug, title, description, counts }>   // GET /v3/channels/:slug
getContentsPage(slug, page=1, per=100): Promise<{ blocks: NormBlock[], hasMore: boolean, nextPage: number|null }>  // GET /v3/channels/:slug/contents
getConnections(slug): Promise<{ channels: {slug,title}[] }>           // GET /v3/channels/:slug/connections (slug per Task 0)
// cache: SvelteMap keyed by slug (NOT plain Map — runes reactivity)
```
Invariant: normalizes via `model.normalizeBlock`; **filters to renderable/available before returning** (field per Task 0); paginates on the observed `meta.has_more_pages`, not raw length.
</contracts>

- [ ] **Step 1:** Failing tests with `fetch` mocked from Task 0 fixtures: `getContentsPage` returns `NormBlock[]` in `data[]` order, filters non-available, reports `hasMore` from `meta`; results cached in a `SvelteMap` (second call = no fetch); `getConnections` returns navigable `{slug}` items. (429 backoff is Task 22 — leave a `TODO(binder-d4d4)`.)
- [ ] **Step 2:** **Run:** `npm test -- arena` → FAIL.
- [ ] **Step 3:** Implement against `https://api.are.na/v3`; base URL a const; `SvelteMap` from `svelte/reactivity`.
- [ ] **Step 4:** **Run:** `npm test -- arena` → PASS.
- [ ] **Step 5:** Commit.

### Task 4: Config resolution

**Orient:** Decides which channels the site shows; the `?channel=` override enables a zero-config shareable deploy.
**Flow position:** boot input to `App`. Wave 1.
**Skill:** `tdd`
**Files:**
- Create: `src/lib/config.js`, `test/config.test.js`

<contracts>
```
resolveConfig(search, fetchJson): Promise<{ title?, about?, logo?, channels: string[], theme?, source: 'params'|'config'|'empty' }>
// precedence: ?channel=/?channels=a,b,c  →  config.json  →  empty ('configure me')
// channels accept bare slug OR are.na URL (extractSlug)
```
</contracts>

- [ ] **Step 1:** Failing tests: `?channels=a,b` wins over config.json; are.na URLs normalize to slugs; missing/failed `config.json` + no param → `source:'empty'`, `channels:[]` (never throws).
- [ ] **Step 2:** **Run:** `npm test -- config` → FAIL.
- [ ] **Step 3:** Implement (inject `fetchJson` for testability).
- [ ] **Step 4:** **Run:** `npm test -- config` → PASS. **Step 5:** Commit.

### Task 5: Hash router

**Orient:** Deep-linking by stable block id (not ordinal) is a preserved Binder property; the drill path lives in the hash.
**Flow position:** consumed by `nav` + `App`. Wave 1.
**Skill:** `tdd`
**Files:**
- Create: `src/lib/router.js`, `test/router.test.js`

<contracts>
```
encodePath(slugs: string[], blockId?: number): string   // '#a/b/c' | '#a/b/c/b:47749402'
decodeHash(hash: string): { slugs: string[], blockId: number|null }
onHash(cb): () => void                                   // subscribe; returns unsubscribe
// depth cap: encodePath truncates slugs at 8 (cycle guard is in nav resolution, not here)
```
</contracts>

- [ ] **Step 1:** Failing round-trip tests: `decodeHash(encodePath(['reading-room','field-notes'], 47749402))` → `{slugs:[...], blockId:47749402}`; empty hash → `{slugs:[], blockId:null}`; >8 slugs truncates.
- [ ] **Step 2:** **Run:** `npm test -- router` → FAIL. **Step 3:** Implement (pure fns + a thin `onhashchange` wrapper). **Step 4:** **Run:** `npm test -- router` → PASS. **Step 5:** Commit.

### Task 6: Stage (two-layer) + minimal renderers (Image, Link, FallbackCard) + dispatcher

**Orient:** Proves the "one full-viewport slot, per-kind renderer" spine — and establishes the content/overlay two-layer architecture so a fallback card can later overlay retained content (Frame 7) without restructuring.
**Flow position:** `nav` → **Stage** → renderer. Wave 1.
**Skill:** `frontend-design`
**Files:**
- Create: `src/components/Stage.svelte`, `src/components/renderers/ImageBlock.svelte`, `src/components/renderers/LinkBlock.svelte`, `src/components/renderers/FallbackCard.svelte`

- [ ] **Step 1:** `Stage.svelte` has **two layers**: a *content layer* (the current inline renderer) and an *overlay layer* (initially empty). It takes a `NormBlock`, `{#if}`-dispatches on `kind` (image → `ImageBlock`, link → `LinkBlock`, `unknown` → `FallbackCard`, else a stub). Full-viewport; the **panel/nav container sits above the Stage** (explicit `z-index` + the Stage's iframe gets `pointer-events` that don't steal nav clicks) so the skeleton NavList stays clickable.
- [ ] **Step 2:** `ImageBlock` = `<img src={block.image.src} srcset="{thumb} 300w, {src} 1200w" alt={block.title}>` (consumes the normalized `thumb`). `LinkBlock` = `<iframe src={block.link.url}>` (denylist wired in Task 12) + an always-visible "open in new tab ▸". `FallbackCard` = `block.link?.thumb`/`image.thumb` + `provider` + `title` + "open in new tab ▸".
- [ ] **Step 3 (Verify):** **Run:** `npm run dev`, wire a hardcoded fixture block. **Expected:** an image block paints with srcset; a link block frames + the escape hatch shows; nav remains clickable over the Stage.
- [ ] **Step 4:** Commit.

### Task 7: App shell wiring (skeleton)

**Orient:** Assembles config + adapter + router + Stage into a running app — the wave's integration proof.
**Flow position:** integrates Wave 1. `config/arena/router` → **App** → `Stage`.
**Skill:** `frontend-design`
**Files:**
- Modify: `src/App.svelte`
- Create: `src/components/NavList.svelte` (plain, unstyled for now)

- [ ] **Step 1:** On mount: `resolveConfig` → set `document.title` from `config.title` (fallback to the AreNotebook default) → take first section slug → `getChannelMeta` + `getContentsPage(slug,1)`. Store blocks in `$state`.
- [ ] **Step 2:** Render a plain `NavList` (numbered `title` + `kind` tag) in a container z-ordered above the Stage. Clicking a block sets the hash via `encodePath`. `onHash` → resolve `blockId` → set the active `NormBlock` → `Stage` renders it.
- [ ] **Step 3:** Landing (skeleton version): empty hash → open the first **Image** block (the only always-paints kind available this wave); if none, show the section index (no auto-open). Deep-link hash → resolve straight to it. *(Full cross-kind landing preference lands in Task 13.)*
- [ ] **Step 4 (Verify):** **Run:** `npm run dev` against a real public channel slug via `?channel=`. **Expected:** blocks list; click opens in the slot; the URL hash + `document.title` update; reloading the deep-link reopens the same block; browser Back works.
- [ ] **Step 5:** Commit.

---

## Wave 2 — Complete the renderer set

*Depends on Wave 1 (Stage, model, FallbackCard). Each renderer task **modifies `Stage.svelte`** to add its dispatch branch — a renderer with no dispatch branch is orphaned.*

### Task 8: Hostname denylist

**Orient:** A static app can't detect a framing refusal, so the shipped denylist is the primary defense against blank frames.
**Flow position:** consumed by `LinkBlock` (Task 12) + NavList `link!` glyph (Task 17). Wave 2 (first).
**Skill:** `tdd`
**Files:** Create: `src/lib/denylist.js`, `test/denylist.test.js`

- [ ] **Step 1:** Failing tests: `isDenylisted('https://www.nytimes.com/...')===true`; `docs.google.com` (allowed) ≠ `google.com`; matched on **full hostname**, not eTLD+1. Seed list from `embedding.md` (nytimes, twitter/x, facebook, instagram, github, linkedin, reddit, youtube-watch).
- [ ] **Step 2:** **Run:** `npm test -- denylist` → FAIL. **Step 3:** Implement hostname-exact matcher. **Step 4:** **Run:** `npm test -- denylist` → PASS. **Step 5:** Commit.

### Task 9: TextBlock + global `{@html}` styles + Stage wiring

**Orient:** Text is user-authored HTML — must be DOMPurify-allowlisted, and scoped styles don't reach `{@html}`, so it's styled globally.
**Flow position:** Stage → TextBlock. Wave 2.
**Skill:** `frontend-design`
**Files:** Create: `src/components/renderers/TextBlock.svelte`; **Modify: `src/components/Stage.svelte`** (add `{:else if kind==='text'}` branch + import), `src/styles/global.css`; Test: `test/sanitize.test.js`

- [ ] **Step 1:** Failing test (runs under jsdom per the vitest config) on the sanitize helper: a `<script>` in `content.html` is stripped; safe tags survive (allowlist).
- [ ] **Step 2:** **Run:** `npm test -- sanitize` → FAIL. Implement `TextBlock` = `{@html DOMPurify.sanitize(block.html)}`; add global `.at-text` typography rules in `global.css`; add the `text` dispatch branch + import in `Stage.svelte`.
- [ ] **Step 3 (Verify):** **Run:** `npm test -- sanitize` → PASS; `npm run dev` shows styled text via the Stage. **Step 4:** Commit.

### Task 10: EmbedBlock (sandboxed `srcdoc`, no sanitize) + Stage wiring

**Orient:** Media embeds are third-party HTML+JS; a sandboxed `srcdoc` iframe isolates them in a null origin **while keeping their scripts intact** — DOMPurify would strip the `<iframe>`/`<script>` they need.
**Flow position:** Stage → EmbedBlock. Wave 2.
**Skill:** `frontend-design`
**Codebooks:** `input-device-adaptation` *(Codebook gap: third-party-embed-isolation-vs-capability)*
**Files:** Create: `src/components/renderers/EmbedBlock.svelte`; **Modify: `src/components/Stage.svelte`** (add `embed` branch + import)

- [ ] **Step 1:** `<iframe srcdoc={block.embedHtml} sandbox="allow-scripts allow-popups" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" loading="lazy">`. **Do not run `embedHtml` through DOMPurify** — the sandbox null-origin is the isolation boundary (Assumption 4). No `src` extraction — whole `embed.html` as `srcdoc`. Empty `embedHtml` → `FallbackCard` (created Wave 1). Add the `embed` dispatch branch + import in `Stage.svelte`.
- [ ] **Step 2 (Verify):** **Run:** `npm run dev` with **both** a `video` embed (YouTube/Vimeo `<iframe>`) **and** a `rich` embed (Twitter/Instagram `<blockquote>`+`<script>`) fixture → both render and the video plays; fullscreen works. **Step 3:** Commit.

### Task 11: AttachmentBlock (PDF / video / audio / download) + Stage wiring

**Orient:** Attachments are are.na-hosted (framing-safe) but iOS Safari can't scroll an iframed PDF, so mobile degrades to a download card.
**Flow position:** Stage → AttachmentBlock. Wave 2.
**Skill:** `frontend-design`
**Codebooks:** `input-device-adaptation`
**Files:** Create: `src/components/renderers/AttachmentBlock.svelte`; **Modify: `src/components/Stage.svelte`** (add `attachment` branch + import)

- [ ] **Step 1:** `application/pdf` → `<iframe>` on desktop (**not** sandboxed — Chrome PDF viewer blanks under sandbox), download card (`FallbackCard`) on mobile (≤768px / touch); `video/*` → `<video controls>`; `audio/*` → `<audio controls>`; else download card. Add the `attachment` dispatch branch + import in `Stage.svelte`.
- [ ] **Step 2 (Verify):** **Run:** dev with a PDF fixture desktop (inline) + emulated mobile (card). **Step 3:** Commit.

### Task 12: LinkBlock denylist + retain-behind-card fallback

**Orient:** Link is the only kind that risks a framing refusal; denylisted hosts skip straight to a card that **overlays retained prior content** (Frame 7), and a time-based escape-hatch nudge recovers denylist misses.
**Flow position:** Stage → LinkBlock → (FallbackCard overlay). Wave 2 — **depends on Task 8 (denylist)**; Stage already routes `link`→LinkBlock from Task 6.
**Skill:** `frontend-design`
**Files:** Modify: `src/components/renderers/LinkBlock.svelte`, `src/components/Stage.svelte`

- [ ] **Step 1:** If `isDenylisted(block.link.url)` OR are.na-channel-link → skip iframe (are.na-link routes to drill via nav). Else `<iframe sandbox="allow-scripts allow-same-origin allow-popups allow-forms" referrerpolicy="strict-origin-when-cross-origin" loading="lazy">` (**no** `allow-top-navigation`).
- [ ] **Step 2:** For the denylisted/refused case, render `FallbackCard` on the Stage's **overlay layer** so the previously-painted content stays behind it (Frame 7 "background stays on the last content"). LinkBlock always renders the escape hatch, made prominent ~2s in (a `setTimeout` state flag — not `onload`, which fires on blocked frames).
- [ ] **Step 3 (Verify):** **Run:** dev — a framable blog frames; `nytimes.com` shows the card overlaying the prior background; the escape hatch appears after the delay. **Step 4:** Commit.

---

## Wave 3 — Complete navigation

*Depends on Wave 1 (router, arena, model). Can overlap Wave 2 **except Task 17**, which needs Task 8's denylist.*

### Task 13: Nav state machine (drill + breadcrumb + cycle guard + full landing)

**Orient:** The nested drill/breadcrumb is the "richer organizing layer"; runes model path state cleanly, and the cycle guard prevents channel loops from spidering.
**Flow position:** `arena/router/model` → **nav** → `Panel`/`Stage`/`App`. Wave 3.
**Skill:** `tdd`
**Files:** Create: `src/lib/nav.svelte.js`, `test/nav.test.js`; Modify: `src/App.svelte`

<contracts>
```
// nav.svelte.js — runes REQUIRE the .svelte.js extension (plain .js throws "$state is not defined")
createNav(config) returns an object exposing reactive fields via GETTERS (not plain properties):
  get path(): Channel[]          // the drill stack (root synthetic + channels), $state-backed
  get breadcrumb(): Crumb[]      // $derived from path; root label = config.title
  get activeBlock(): NormBlock|null
  enter(slug), pop(toDepth), jump(slug), open(blockId), landing()
// cycle guard: refuse to push a channel id already on path; depth cap 8
// connection jump: FRESH breadcrumb rooted at target (does not append)
```
</contracts>

- [ ] **Step 1:** Failing tests: `enter` pushes a drill node; `pop` truncates; a channel already on the path is refused (cycle guard); depth caps at 8; `jump` resets the breadcrumb; resolved channels cache in `SvelteMap`; **reactive fields read live through the getters** (mutate `path`, observe `breadcrumb` update).
- [ ] **Step 2:** **Run:** `npm test -- nav` → FAIL. **Step 3:** Implement in `nav.svelte.js`; expose `path`/`breadcrumb`/`activeBlock` via getters over `$state`/`$derived`; drive fetches through the adapter cache.
- [ ] **Step 4:** **Run:** `npm test -- nav` → PASS.
- [ ] **Step 5: Full `landing()` (the design's blank-card guard):** implement + test — rank landing candidates **Image → Embed(non-empty) → Attachment → known-framable Link** (a `known-framable` Link is one **not** `isDenylisted`); skip denylisted-Link and empty-embed candidates; if no painting candidate exists, **show the section index with a calm empty stage — never auto-open on a card**. Test each branch. (This supersedes the Task 7 skeleton landing; needs Task 8's `isDenylisted`.)
- [ ] **Step 6 (Verify):** **Run:** `npm run dev` — drilling a `>ch` node swaps the list + grows the breadcrumb; `‹` pops; a self-connecting channel doesn't loop; an image-first channel auto-opens the image; a links-only-denylisted channel shows the index, not a card. **Step 7:** Commit.

### Task 14: Several sections at root + per-section degrade

**Orient:** The site is several top-level channels; one bad slug must not blank the whole site.
**Flow position:** `config` → **nav root** → Panel. Wave 3 — depends on Task 13.
**Skill:** `tdd`
**Files:** Modify: `src/lib/nav.svelte.js`, `src/App.svelte`; Test: `test/nav.test.js`

- [ ] **Step 1:** Synthetic root node whose entries are the config section channels; root fetches N section metas (one page each). A 404/private slug renders as a marked-dead entry; other sections still render (test with one failing slug mock).
- [ ] **Step 2:** **Run:** `npm test -- nav` → FAIL. **Step 3:** Implement `Promise.allSettled` over sections. **Step 4:** **Run:** `npm test -- nav` → PASS. **Step 5:** Commit.

### Task 15: Lazy pagination

**Orient:** A 3000-block channel must not fire 30 calls into a 30/min-limited API; page 1 free, more on demand.
**Flow position:** adapter/nav. Wave 3.
**Skill:** `tdd`
**Files:** Modify: `src/lib/nav.svelte.js`, `src/components/NavList.svelte`; Test: `test/nav.test.js`

- [ ] **Step 1:** Failing test: entering a channel renders page 1 only; a "load more" action fetches the next page and appends; paginates on observed `hasMore`, not raw length; a render cap is enforced.
- [ ] **Step 2:** **Run:** `npm test -- nav` → FAIL. **Step 3:** Implement. **Step 4:** **Run:** `npm test -- nav` → PASS. **Step 5:** Commit.

### Task 16: Breadcrumb + ConnectionsStrip components

**Orient:** Connections are sideways jumps; the strip must hide any channel already on the path (no cyclic affordance).
**Flow position:** nav → Panel subcomponents (mounted by Panel in Task 19). Wave 3.
**Skill:** `frontend-design`
**Files:** Create: `src/components/Breadcrumb.svelte`, `src/components/ConnectionsStrip.svelte`; **Modify: `src/App.svelte`** (temporary mount for verification, removed when Panel lands in Task 19)

- [ ] **Step 1:** `Breadcrumb` renders `path` labels, `‹` pops one level; root label = config title. `ConnectionsStrip` calls `getConnections(slug)`, renders navigable `>x >y`, hides on-path channels; a click = `nav.jump` (fresh breadcrumb). Mount both temporarily in `App.svelte` so they're observable now; Panel (Task 19) becomes their permanent home.
- [ ] **Step 2 (Verify):** **Run:** dev — breadcrumb grows/pops; a connection jump reroots. **Step 3:** Commit.

### Task 17: NavList polish (numbered index, tags, `>ch N`, `link!`)

**Orient:** The calm numbered index with kind tags, drill counts, and the `link!` pre-warning is the storyboard's legibility graft.
**Flow position:** nav → NavList. Wave 3 — **depends on Task 8 (denylist) for the `link!` glyph** (gate this task on Task 8 even though Wave 3 otherwise overlaps Wave 2).
**Skill:** `frontend-design`
**Files:** Modify: `src/components/NavList.svelte`

- [ ] **Step 1:** Number `available` blocks by display order; right-align a `kind` tag; Channel blocks show `>ch N` (N = the normalized `count`); a denylisted Link (`isDenylisted`) shows `link!`; active row is live `.active`.
- [ ] **Step 2 (Verify):** dev — index matches storyboard Frame 2 (counts + `link!` present). **Step 3:** Commit.

---

## Wave 4 — Signature UX & theming

### Task 18: Draggable panel action (native Pointer Events)

**Orient:** The floating draggable box is a load-bearing Binder signature; it must survive the jQuery-UI/touch-punch removal via native Pointer Events, including on wide touch devices.
**Flow position:** used by Panel. Wave 4.
**Skill:** `frontend-design`
**Codebooks:** `gesture-disambiguation`, `input-device-adaptation`
**Files:** Create: `src/lib/drag.js`

- [ ] **Step 1:** `use:drag` action: `pointerdown`/`move`/`up` with `setPointerCapture`; **set `touch-action: none` on the handle** (or `preventDefault()` in `pointerdown`) so wide touch devices (iPad landscape, touch laptops) don't steal the gesture as scroll; drag by the handle; **cancel on `li`** (nav clicks aren't drags); **disabled ≤768px** with style reset.
- [ ] **Step 2 (Verify):** **Run:** dev — drag with mouse and with a real touch device / DevTools touch; clicking a nav item still navigates; below 768px the panel pins and doesn't drag. **Step 3:** Commit.

### Task 19: Panel component (per-level header + hamburger)

**Orient:** Logo + about fold into one calm floating panel header (storyboard Fork A), and the header **swaps per level** to the entered channel's identity.
**Flow position:** nav/drag → **Panel** → App. Wave 4.
**Skill:** `frontend-design`
**Files:** Create: `src/components/Panel.svelte`; Modify: `src/App.svelte` (remove the Task 16 temp mounts; render Panel)

- [ ] **Step 1:** Panel = header → Breadcrumb → NavList → ConnectionsStrip; `use:drag`; mobile hamburger toggles the nav.
- [ ] **Step 2 (header swap — coverage fix):** the header shows **config `title`/`about` at the synthetic root**, and **swaps to the currently-entered channel's `title` + `metadata.description`** when drilled in (bind to nav's active path node so it updates on drill/pop). The small logo mark shows at root.
- [ ] **Step 3 (Verify):** dev desktop + mobile — matches storyboard Frames 1–2 & 9; the header/about text changes when you drill into a section and reverts on `‹`. **Step 4:** Commit.

### Task 20: Theme tokens + `applyTheme` (wired into boot)

**Orient:** The signature look ships as tokenized defaults so a self-hoster can restyle via `config.theme` without a rebuild.
**Flow position:** config → theme → global.css. Wave 4.
**Skill:** `tdd`
**Files:** Create: `src/lib/theme.js`, `test/theme.test.js`; **Modify: `src/App.svelte`** (call `applyTheme` at boot), `src/styles/global.css`

- [ ] **Step 1:** Failing test: `applyTheme({ 'panel-bg':'#000', 'border':'not-a-color' })` maps unprefixed config keys → `--an-*` CSS vars, **validates CSS shapes** (rejects `not-a-color`, keeps the default), and sets valid props via `documentElement.style.setProperty`. (Token defaults already live in `global.css` from Task 1.)
- [ ] **Step 2:** **Run:** `npm test -- theme` → FAIL. **Step 3:** Implement `theme.js`; **wire `applyTheme(config.theme)` into `App.svelte` boot** (right after `resolveConfig`). **Step 4:** **Run:** `npm test -- theme` → PASS.
- [ ] **Step 5 (Verify):** dev — omitting `theme` yields the exact classic look; a `theme` override restyles live. **Step 6:** Commit.

### Task 21: Signature fidelity + mobile pass

**Orient:** The box-shadow/monospace/active-black identity must be pixel-faithful; this is the visual acceptance gate.
**Flow position:** post-composition gate. Wave 4.
**Skill:** `shadow-walk`
**Files:** Modify: `src/styles/global.css`, `src/components/Panel.svelte`

- [ ] **Step 1:** Match `style.css`: `box-shadow: var(--an-shadow-1) 3px 3px 0, 6px 6px 0 var(--an-shadow-2)`, blue border, `#eee` bg, monospace, active row `#000`. Reimplement the ≤768px mobile layout (pinned bar, hamburger, hidden about) without the legacy touch-device hack.
- [ ] **Step 2 (Verify):** dev at desktop + 375px — visually matches the original Binder; compare against the old `style.css` render. **Step 3:** Commit.

---

## Wave 5 — Runtime resilience

### Task 22: 429 backoff (status-based) + best-effort rate-limit headers

**Orient:** V3 enforces guest 30/min; unhandled 429s would break browsing under heavy drilling — and the backoff must work with only what the browser can read.
**Flow position:** hardens the adapter. Wave 5 — depends on Task 0's header-readability finding.
**Skill:** `tdd`
**Codebooks:** `flow-control-backpressure`
**Files:** Modify: `src/lib/arena.js`; Test: `test/arena.test.js`

- [ ] **Step 1:** Failing test: a mocked `429` triggers **backoff on the status alone** (exponential/fixed) then a single retry; repeated 429 surfaces a typed error (not a throw into the UI). **Only if** Task 0 confirmed `X-RateLimit-Reset` is browser-readable, refine the delay from it; otherwise ignore headers entirely.
- [ ] **Step 2:** **Run:** `npm test -- arena` → FAIL. **Step 3:** Implement (replace the Task 3 `TODO`). **Step 4:** **Run:** `npm test -- arena` → PASS. **Step 5:** Commit.

### Task 23: Loading / empty / error states

**Orient:** Failure states must be named, never a blank spinner or crash (storyboard Frame 1 + config empty state).
**Flow position:** App/Panel/Stage. Wave 5.
**Skill:** `frontend-design`
**Files:** Create: `src/components/EmptyState.svelte`; Modify: `src/App.svelte`, `src/components/Panel.svelte`

- [ ] **Step 1:** Skeleton box while loading; "channel unreachable" for a dead section; `config.source==='empty'` → the "configure me" `EmptyState`; a rate-limited fetch shows a calm "slow down" notice.
- [ ] **Step 2 (Verify):** dev — force a 404 slug, an empty config, and a simulated 429; each shows its named state. **Step 3:** Commit.

---

## Wave 6 — Migration, rebrand, deploy

### Task 24: `info.json` → `config.json` cutover + legacy removal

**Orient:** The old jQuery engine and `info.json` are fully superseded; leaving them ships dead, confusing code.
**Flow position:** cutover. Wave 6 — depends on the app working (Waves 1–5).
**Skill:** `none`
**Files:** Create: `config.json`; Delete: `info.json`, `js/google-docs-site.1.0.js`, `js/vendor/*`; Modify: (root `index.html` already replaced in T1 — confirm no legacy refs, no GA)

- [ ] **Step 1:** Write a sample `config.json` (`title`, `about`, `logo`, `channels:["<real-public-slug>"]`) per `docs/design/config.md`. Delete `info.json`, `js/google-docs-site.1.0.js`, the `js/vendor/` libs.
- [ ] **Step 2 (Verify):** **Run:** `grep -ri "jquery\|touch-punch\|modernizr\|google-analytics" index.html src/ || echo clean`. **Expected:** `clean`. `npm run build` still succeeds.
- [ ] **Step 3:** Commit.

### Task 25: Rebrand Binder → AreNotebook

**Orient:** The name decision (with its flagged trademark caveat) lands here; do the sanity-check first since it's cheapest before propagation.
**Flow position:** rebrand. Wave 6.
**Skill:** `none`
**Files:** Modify: `README.md`, `package.json` (name), page `<title>`, assets as needed

- [ ] **Step 1:** **Trademark sanity-check** on "AreNotebook" (per `docs/design/name.md` caveat) — if it clears, proceed; if not, escalate the name to the maintainer before renaming.
- [ ] **Step 2:** Rewrite `README.md`: what AreNotebook is, the `config.json` schema, the `info.json`→Are.na **migration guide** (create a channel, add blocks, list slugs), the **guest 30/min rate-limit** note, the **`base:'./'` subpath-hosting** note, self-host/deploy steps. Set `package.json` `name`, the `document.title` default (consumed by Task 7's boot fallback), favicon/logo.
- [ ] **Step 3 (Verify):** README renders; `grep -ri "binder" src/ index.html` shows only intentional references. **Step 4:** Commit.

### Task 26: Build + deploy story

**Orient:** The payoff is a static `dist/` that drops onto any static host.
**Flow position:** terminal. Wave 6.
**Skill:** `none`
**Files:** Modify: `README.md` (deploy section); Create: optional `netlify.toml`/Pages note

- [ ] **Step 1:** `npm run build` → `dist/`; `npm run preview` to smoke-test the production bundle. Document GitHub Pages / Netlify / nginx drops and the `base:'./'` requirement for subpath hosting.
- [ ] **Step 2 (Verify):** **Run:** `npm run build && npm run preview`, load the preview against `?channel=<public-slug>` (and, if Pages is the target, from a subpath). **Expected:** the built app lists + opens blocks identically to dev. **Step 3:** Commit.

---

## Execution Waves

- **Wave 0** — Task 0 (spike) → Task 1 (scaffold) → Task 2 (model). *Serial: 0 gates 2 & 3; 2 depends on 1's Vitest harness.*
- **Wave 1** — Tasks 3, 4, 5 (parallel) → 6 → 7. *Depends on Wave 0.* Walking skeleton; Task 6 also creates FallbackCard.
- **Wave 2** — Task 8 → {9, 10, 11, 12}. *Depends on Wave 1 (Stage/model/FallbackCard).* 9/10/11 are parallel and each **modifies `Stage.svelte`** (serialize the three tiny Stage edits or merge into one dispatch step to avoid a write race); 12 depends on Task 8.
- **Wave 3** — Task 13 → {14, 15, 16, 17}. *Depends on Wave 1 (nav inputs).* Overlaps Wave 2 **except: Task 13 Step 5 (full landing) and Task 17 depend on Task 8 (denylist).**
- **Wave 4** — Task 18 → 19 → {20, 21}. *Depends on Wave 1 shell; consumes Wave 3 nav.*
- **Wave 5** — Tasks 22, 23 (parallel). *Depends on Wave 1 adapter + Wave 3 nav + Task 0 header finding.*
- **Wave 6** — Tasks 24 → 25 → 26 (serial). *Depends on all.*

## Open Questions

### Blocking (must answer before the dependent wave — all folded into the Task 0 spike)
- **Task 0 → 2/3:** exact V3 fields for (a) image URL(s), (b) block **renderability/availability** (V2 `state=="available"` equivalent), (c) Channel-block **item count** (`>ch N`), (d) `/connections` **item shape** (channel `slug` direct, or URL → `extractSlug`?). The data layer + ConnectionsStrip key on these.
- **Task 0 → 22:** are `X-RateLimit-*` / `Retry-After` **readable in-browser** (CORS-exposed)? Decides whether Task 22 can use `Reset` or must backoff on `429` status alone.
- **Task 3:** does `GET /v3/channels/:slug` include any `contents`, or is `/contents` strictly separate? (Confirms the two-call model + rate budget.)

### Exploratory (answerable during implementation)
- **Task 12:** which additional hosts belong in the seed denylist beyond `embedding.md`'s set? (Living file; escape hatch covers misses.)
- **Task 21:** does the folded-header layout preserve the original box proportions with the 300px logo? (Visual; tune in the fidelity pass.)

## Artifact Manifest

<!-- PLAN_MANIFEST_START -->
| File | Action | Marker |
|------|--------|--------|
| `docs/research/arena-v3-field-confirmation.md` | create | `image URL` |
| `package.json` | create | `@sveltejs/vite-plugin-svelte` |
| `vite.config.js` | create | `base` |
| `vitest.config.js` | create | `jsdom` |
| `index.html` | patch | `id="app"` |
| `src/main.js` | create | `styles/global.css` |
| `src/styles/global.css` | create | `--an-shadow-1` |
| `src/lib/model.js` | create | `normalizeBlock` |
| `src/lib/arena.js` | create | `getContentsPage` |
| `src/lib/config.js` | create | `resolveConfig` |
| `src/lib/router.js` | create | `encodePath` |
| `src/lib/nav.svelte.js` | create | `createNav` |
| `src/lib/denylist.js` | create | `isDenylisted` |
| `src/lib/theme.js` | create | `applyTheme` |
| `src/lib/drag.js` | create | `setPointerCapture` |
| `src/components/Stage.svelte` | create | `overlay` |
| `src/components/Panel.svelte` | create | `use:drag` |
| `src/components/renderers/EmbedBlock.svelte` | create | `srcdoc` |
| `src/components/renderers/LinkBlock.svelte` | create | `open in new tab` |
| `src/components/renderers/FallbackCard.svelte` | create | `provider` |
| `config.json` | create | `channels` |
| `info.json` | delete | (must not exist) |
| `js/google-docs-site.1.0.js` | delete | (must not exist) |
| `README.md` | patch | `AreNotebook` |
<!-- PLAN_MANIFEST_END -->

## Decision-Reference Summary

| Ref | Decision (short) | Applied in |
|---|---|---|
| `binder-d4d4` | Build on V3; field map; guest 30/min + 429 backoff | Task 0, 2, 3, 22 |
| `binder-7ac4` | Sections → drill + connections; hash by block id; no fetch-all; landing guard | Task 5, 7, 13–17 |
| `binder-ab29` | Per-kind renderers; denylist + escape hatch + retain-behind card; sandbox/DOMPurify split | Task 6, 8–12 |
| `binder-c14b` | Svelte 5 + Vite; `{@html}` global styles; `SvelteMap`; runes-in-`.svelte.js`; hand-rolled routing | Task 1, 3, 5, 9, 13, 20 |
| `binder-5299` | `config.json` + `?channel=`; tokenized signature theme | Task 4, 20, 24 |
| `binder-e3d6` | Storyboard; active row black; per-level header; retain-behind card | Task 17, 19, 21 |
| `binder-c8c3` | Name AreNotebook; trademark sanity-check first | Task 25 |

## Escalations (need maintainer awareness — decision-doc corrections)

- **E-1 (`arena-api-v3.md` §Rate limits) — RESOLVED (2026-07-11):** Task 0 confirmed the `X-RateLimit-*` headers are not browser-readable (empty `Access-Control-Expose-Headers`). `arena-api-v3.md` §Rate limits has been corrected with a dated note; Task 22 backs off on the `429` status alone. No maintainer action needed.

## Deviations from writing-plans defaults (intentional)

- **Q-N → seeds/design-doc refs:** this repo's decision record is the seeds map + `docs/design/*`, not `docs/decisions/<scope>.md`. Constraints are cited by resolving ticket id + doc (above). No `docs/decisions/` invented.
- **No `ml record` structural-conventions step:** mulch is left untouched per the maintainer's standing instruction ("Seeds-only, mulch untouched").
- **Seeds DAG materialization deferred:** the plan can be materialized as a seeds DAG (26 issues + dependency edges) *after* approval, so review edits don't churn the tracker. Offered at handoff, not done inline.

## Shape Changes

| Date | Role | Finding | Summary |
|---|---|---|---|
| 2026-07-11 | author | — | Initial plan authored from `docs/design/*` + `docs/research/*`. |
| 2026-07-11 | auditor | 3-dimension review (coverage/technical/executability) | Fixed Stage-dispatch wiring (blocker); runes→`.svelte.js` + getter-exposed reactivity; embeds not DOMPurify'd (sandbox isolation); 429 backoff on status not headers (+ E-1); FallbackCard moved to Wave 1; global.css created+imported in T1; applyTheme wired into boot; per-level header swap; full landing guard; `srcset`/`>ch N`/`document.title`; drag `touch-action`; jsdom test env; `base:'./'`. |
