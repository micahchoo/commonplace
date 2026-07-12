# ISSUES — AreNotebook (tend)

> Generated 2026-07-11 · commit `ae5c299` (branch `arenotebook-build`, working tree dirty:
> mid-flight Panel/Cover/Text/Embed layout batch uncommitted).
> Gate: suite green (70/70), no data-loss risk. **One security finding surfaced (I1) —
> that is the platform check itself; fix I1 before any growth converges.**
>
> Re-run modes: a continuation re-run diffs this file and surfaces deltas; a fresh re-run
> treats live rows as already-found and the `## Decided` index as do-not-resurrect.
> Fields per row: Evidence · Rungs · Why high-leverage (Lesson) · Loop · Strength · Status.

---

## I1 — Remote channel-description HTML reaches `{@html}` unsanitized

- **Evidence.** `arena.js:55` sets `description: j.description?.html || …` — raw Are.na channel
  description HTML. It flows through `nav.about` (`nav.svelte.js:50`, drilled branch) to
  **two** unguarded sinks: `Panel.svelte:46` `{@html nav.about}` and `Cover.svelte:16`
  `{@html about}`. Neither passes through `sanitize.js`. The only sanitized sink in the app is
  `TextBlock.svelte:5` (`sanitizeHtml(block.html)`). So the codebase injects remote HTML two
  ways — sanitized for Text, raw for the channel description.
- **Rungs.** L4↔L2 (also L1 trust-surface): the sanitizer exists at L4 but is applied
  inconsistently, exposing an XSS surface on the L2 drilled-header behavior. A channel owner
  (or anyone whose public channel a self-hoster points at) controls that HTML.
- **Why high-leverage (Lesson).** One concern — "inject remote HTML" — done two ways doubles
  the ways the next change goes wrong, and here the second way is an injection hole the design
  doc already flagged (`organizing-model.md:99`: "injected HTML is a third-party-HTML trust
  surface"). Fixing it canonicalizes *all* remote-HTML rendering onto one sanitized path.
  Teaches **canonicalization** — one way to do each thing.
- **Loop.**
  ```
  This codebase renders remote-sourced HTML two ways: TextBlock.svelte sanitizes via
  sanitizeHtml (sanitize.js), while Panel.svelte:46 and Cover.svelte:16 render the Are.na
  channel description ({@html nav.about} / {@html about}) raw. Pick the winner: every remote
  HTML string passes through sanitizeHtml before {@html}. Ledger ledgers/CANON.md: losing call
  site | file | migrated commit | tests green. Enumerate every {@html} sink in src/ that
  renders non-config data BEFORE migrating any (grep '@html' src/ — classify each sink's source
  as config-trusted or remote); then route each remote sink through sanitizeHtml under a test
  that asserts a <script>/onerror payload in a channel description is stripped, committing per
  site. At zero raw remote sinks, add the one-line rule to CLAUDE.md: all remote HTML through
  sanitizeHtml before {@html}. Done at zero raw remote sinks and the lock recorded.
  ```
- **Strength.** Strong — two channels verified this run: the code path (arena→nav→two sinks,
  sanitizer bypassed) and the design doc naming the trust surface.
- **Status.** queued

---

## I2 — Connections fetched with no cache, against the README's caching promise

- **Evidence.** `arena.js` caches meta (`metaCache`, `:26/53/61`) and pages (`pageCache`,
  `:27/67/75`) but `getConnections` (`:79-85`) has no cache. `nav.#loadConnections` is called
  on every `enter`, `pop`, and `jump` (`nav.svelte.js:111,121,130`), re-hitting
  `/channels/:slug/connections` each time. README rate-limits section (`README.md:91-93`)
  promises "caching channels in-session" and 429 resilience within a 30 req/min guest budget.
- **Rungs.** L3↔L4: the caching pattern is applied everywhere but this one fetch (structural
  inconsistency), and the gap burns request budget the README says is conserved (claim-vs-
  reality). Re-drilling the same node re-fetches its connections every time.
- **Why high-leverage (Lesson).** A README that promises behavior the code doesn't deliver is
  worse than silence — every reader (including the next AI session) builds on the lie, and here
  the lie spends a scarce rate budget. Teaches **documentation drift**.
- **Loop.**
  ```
  Extract every claim README.md's "Rate limits" section makes about caching/backoff and check
  each against arena.js + nav.svelte.js; also list caching the code does that the docs omit.
  Ledger ledgers/CLAIMS.md: claim | where claimed | what the code does | type
  (claimed-not-implemented / implemented-not-documented / implemented-differently) | resolution
  | commit | recheck. Finish the whole diff before resolving; then per row fix the code (add a
  connectionsCache SvelteMap keyed by slug, mirroring metaCache), fix the docs, or deprecate —
  one commit each, rechecking the row after its fix. Done when re-running the full diff finds
  nothing.
  ```
- **Strength.** Strong — two channels: the structural cache-gap and the README claim.
- **Status.** queued

---

## I3 — Design docs still speak Binder/V2 while code is AreNotebook/V3

- **Evidence.** `docs/design/config.md:48-56` documents theme tokens as `--binder-panel-bg` …
  `--binder-accent`; the real custom properties (`global.css:10-16`, `theme.js:7-15`) are all
  `--an-*`. The three governing design docs (`config.md`, `organizing-model.md`,
  `embedding.md`) are written in "Binder" terms, cite V2 field names, and reference ticket ids
  (`binder-5299`, `binder-ab29`); `organizing-model.md:3` self-flags "field names V2-verified —
  translate per that doc." README + `public/config.json` are already rebranded AreNotebook.
- **Rungs.** L1↔L4: the stated design (L1 docs) names variables and fields that no longer exist
  in the implementation (L4). A self-hoster theming from `config.md`'s token names targets
  non-existent `--binder-*` variables.
- **Why high-leverage (Lesson).** The docs are the first thing the next contributor and the AI
  read; a doc that lies about token names or field paths makes every downstream change start
  from a false map. Teaches **documentation drift**.
- **Loop.**
  ```
  Extract every claim docs/design/{config,organizing-model,embedding}.md makes about token
  names, config field paths, and Are.na field names, and check each against theme.js /
  global.css / config.js / model.js / arena.js. Ledger ledgers/CLAIMS.md: claim | where claimed
  | what the code does | type (claimed-not-implemented / implemented-not-documented /
  implemented-differently) | resolution | commit | recheck. Finish the whole diff before
  resolving; then per row fix the doc (rename --binder-* → --an-*, V2 fields → V3, correct
  ticket refs) or add a one-line "historical, see V3 field map" banner where a doc is a decision
  record not a spec — one commit each. Done when re-running the diff finds nothing.
  ```
- **Strength.** Worth exploring — one channel (docs vs code), verified.
- **Status.** queued

---

## I4 — Connection-fetch failures vanish with no user signal

- **Evidence.** `nav.svelte.js:98-100` — `#loadConnections` swallows any failure into
  `this.connections = []` with no surfaced error; the strip simply doesn't appear, identical to
  a channel that legitimately has none. Only `#loadChannel` (`:82-90`) surfaces its error.
  Six other silent catches exist (`config.js:35`, `model.js:34/51`, `denylist.js:24`,
  `drag.js:49`) but those degrade to safe defaults on parse edge cases; the connections one
  hides a network/API failure on the rate-limited path I2 is about.
- **Rungs.** L4↔L2: the L4 handler swallows a failure that changes L2 behavior (missing
  connections strip) with no way for user or developer to tell a fetch failed from an empty set.
  README (`:91-93`) promises graceful 429 recovery — a silently-empty strip is neither recovery
  nor signal.
- **Why high-leverage (Lesson).** A swallowed failure still happened; you've agreed to learn
  about it from users. On a 30 req/min budget, a 429 that empties the strip silently reads as
  "this channel has no connections" forever. Teaches **observability**.
- **Loop.**
  ```
  Find every error-handling site in src/ — catch blocks, .catch() callbacks, fetch calls with no
  failure branch. Ledger ledgers/SILENCE.md: site | trigger | disposal today | should be | fix
  commit | forced check. Classify each — unhandled / swallowed / logged-and-lost / surfaced —
  fixing nothing; then fix so every network/API failure reaches a console.warn a developer sees
  AND a calm user signal where one belongs (a 429 while loading connections must be
  distinguishable from an empty strip), parse-edge defaults may stay silent. Force each fixed
  site's failure in a dev run with a simulated fault (unreachable URL, injected throw) — never
  the live API — and confirm it lands where the row says. Done when every network/API row reads
  surfaced and every forced failure was observed.
  ```
- **Strength.** Worth exploring — one channel (code), verified; user-facing impact reasoned not
  yet driven.
- **Status.** queued

---

## I5 — `drag.js` and the interaction/renderer layer have zero test cover

- **Evidence.** `drag.js` (66 lines: pointer capture, mobile guard, control-click exclusion —
  the most stateful non-nav module) has **no** test file. No component test exists for
  `Panel.svelte`, `NavList.svelte`, `Breadcrumb.svelte`, `ConnectionsStrip.svelte`,
  `EmptyState.svelte`, or the individual `Image/Link/Embed/Attachment/FallbackCard` renderers;
  only `Stage` dispatch, `Cover`, and `TextBlock` are component-tested. The `LinkBlock`
  2-second prominence timer (`LinkBlock.svelte:11-15`) and `AttachmentBlock` mobile/desktop PDF
  fork (`AttachmentBlock.svelte:13-21`) are happy-path only.
- **Rungs.** L4↔L3: core interaction logic (L4) at the structural center of the signature UX
  (L3 draggable panel) has no safety net, making it the scariest file in the repo to change.
- **Why high-leverage (Lesson).** Tests are executable memory — they let you change the drag
  state machine without re-deriving it. The signature draggable panel is the product's identity;
  it is the one place a regression is most visible and least caught. Teaches **test coverage**.
- **Loop.**
  ```
  Run npx vitest run --coverage for src/ and rank files by how much the app depends on them ×
  how little coverage they have — drag.js and the untested renderers outrank glue. Ledger
  ledgers/COVERAGE.md: file | behavior under test | before | after | bug exposed | fix commit |
  retest. Write tests that assert behavior (drag starts on pointerdown outside controls, ignores
  control-click, respects the mobile guard, releases capture on pointerup; LinkBlock promotes
  after its timer; AttachmentBlock forks on the mobile flag) — never tests that merely touch
  lines. When a test on old code exposes a real bug, give it its own row and fix commit. Done
  when drag.js and every core renderer exceed 70% and every bug row reads pass.
  ```
- **Strength.** Worth exploring — one channel (coverage gap), verified.
- **Status.** queued

---

## I6 — The new home Cover is off the primary boot journey

- **Evidence.** `App.svelte:54-56` auto-enters the first non-dead section on an empty hash
  (`history.replaceState`), so post-boot `nav.atRoot` is false. The Cover render gate is
  `booted && channels.length && nav.atRoot && !nav.active` (`App.svelte:66`). Net: on a normal
  first load the contact-sheet Cover is **skipped** — it appears only if the user later clicks
  the root breadcrumb. Yet `collectThumbnails(...)` runs on every boot (`App.svelte:49`), so its
  result (`coverThumbs`) is computed and usually never displayed. (Mid-flight uncommitted work.)
- **Rungs.** L2↔L2 seam: two individually-working behaviors (auto-enter-first-section and
  show-Cover-at-root) are mutually exclusive on the main path, so the just-built feature never
  fires where the user first lands.
- **Why high-leverage (Lesson).** Features pass alone and fail together; the product is the path
  between them, and this seam hides a brand-new feature behind an auto-navigation that predates
  it. Teaches **end-to-end journeys**. (Scope note: this is live uncommitted work — confirm the
  intended landing with the author before "fixing".)
- **Loop.**
  ```
  Act as a first-time user opening AreNotebook with the shipped config.json and an empty hash:
  start the app locally (npm run dev) — never a deploy — and follow only what the interface
  suggests until you reach a rendered block, logging every step. Ledger ledgers/JOURNEY.md: step
  | expected | actual | friction 0-3 | fix commit | re-walk. Specifically record whether the new
  home Cover ever appears on first load, whether a text-only channel lands on a blank stage
  (nav.landing excludes Text, nav.svelte.js:168), and whether coverThumbs is computed but unshown.
  Fix nothing mid-walk; then decide with the author whether boot should land on the Cover or
  auto-enter, fix worst-first one commit each, re-walking the whole journey after each fix. Done
  when the journey reaches a rendered view with no dead end and its worst step is fixed or
  explicitly accepted.
  ```
- **Strength.** Worth exploring — one channel (code trace), verified.
- **Status.** queued

---

## I7 — `?channel=` zero-config mode silently drops title/about/logo/theme

- **Evidence.** `config.js:27-30` (params branch) returns `{ channels, source:'params' }` only;
  the config-file branch (`:42-49`) returns `title/about/logo/theme` too. So the URL zero-config
  mode documented at `README.md:54-56` renders with no title, no about, and the default (classic
  Binder) theme, silently — the two config sources diverge with no note.
- **Rungs.** L2 seam: one documented entry path (`?channel=`) delivers a strictly poorer feature
  than the other (`config.json`) with nothing telling the user why.
- **Why high-leverage (Lesson).** Two ways in that behave differently is a seam users fall
  through; either close the gap (accept `?title=`/`?theme=` params) or document the limitation.
  Teaches **end-to-end journeys** at the config seam.
- **Loop.**
  ```
  For each documented entry mode in README (config.json and ?channel=/?channels= params), probe
  what the app actually surfaces: title, about, logo, theme, single vs multi channel, bad slug.
  Ledger ledgers/NEGSPACE.md: mode | case | actual | verdict | fix commit | retest. Probe a local
  run with test slugs — never a deploy. Fill every actual before fixing; a clear documented
  limitation passes, a silent feature-drop fails. Then fix row by row — either accept
  ?title=/?theme= params in the params branch of config.js, or document the params-mode
  limitation in README. Done when every row reads pass.
  ```
- **Strength.** Worth exploring — one channel (code), verified.
- **Status.** queued

---

## I8 — `DEPTH_CAP` invariant declared in two modules

- **Evidence.** `router.js:7` (truncates slug path) and `nav.svelte.js:13` (guards `enter`) each
  own their own depth-cap value/logic. Same invariant (drill depth ≤ 8), two sources of truth —
  changing the cap means editing both, and a mismatch would let nav enter deeper than the router
  can encode.
- **Rungs.** L3: one concern implemented in two places; a silent coupling between router and nav.
- **Why high-leverage (Lesson).** Every second definition of one invariant is a way for the two
  to drift; export one constant and both consume it. Teaches **canonicalization**. (Small, but a
  genuine load-bearing coupling.)
- **Loop.**
  ```
  DEPTH_CAP is defined in two places (router.js:7, nav.svelte.js:13). Pick the winner: one
  exported constant. Ledger ledgers/CANON.md: losing call site | file | migrated commit | tests
  green. Enumerate both sites and every reference BEFORE migrating; then export DEPTH_CAP from
  one module (or a shared const), import it in the other, run the suite, commit. Add a one-line
  CLAUDE.md rule: shared invariants get one exported constant, never a re-declared literal. Done
  at one definition and the lock recorded.
  ```
- **Strength.** Worth exploring — one channel (code), verified.
- **Status.** queued

---

## I9 — Dead legacy files, orphaned exports, and one god-module

- **Evidence.** Inert pre-rebuild artifacts still in the tree, referenced by nothing
  (`index.html`/`main.js` import `src/styles/global.css`): root `style.css`
  (`Author: Clement Valla, Version: 1.0`), empty `readme.txt`, original Binder `todo.txt`.
  Orphaned exports: `router.js:36 onHash(cb)` — never imported (`App.svelte:60` wires
  `hashchange` by hand); `denylist.js:29 denylist()` — never imported (only `isDenylisted` is
  used); `arena.js:12 ARENA_BASE` — exported but only used internally. God-module: `model.js` is
  depended on by arena.js, config.js, nav landing, and every renderer (via NormBlock) — the
  widest blast radius in the repo.
- **Rungs.** L3: modules and exports nothing would miss if deleted (dead), plus one god-module
  whose reach makes any field-path change touch every renderer.
- **Why high-leverage (Lesson).** Unused code isn't free — it's text the next reader and the AI
  reread, tests skip, and a bug hides behind. The legacy root files actively mislead (they read
  as live config/docs). Teaches **dead-code elimination**.
- **Loop.**
  ```
  For every module and top-level export in src/ plus the root files (style.css, readme.txt,
  todo.txt), answer: what breaks if this goes away? Trace real inbound references — static
  imports, dynamic imports, index.html/main.js, string refs — not guesses. Ledger
  ledgers/DEADWOOD.md: module/export | inbound references | class (dead/healthy/god) | action |
  commit | test run. Classify everything before deleting anything; then delete each dead item —
  full test run (npm test) after every deletion, one commit per deletion (remove onHash and
  denylist() only after confirming zero importers; keep ARENA_BASE or inline it). For the
  model.js god-module, write a split plan (normalization vs URL/slug helpers vs title
  derivation) but DON'T execute it. Done at zero dead items and model.js holding a split plan or
  a recorded reason to stay whole.
  ```
- **Strength.** Worth exploring — one channel (reference tracing), verified for the named items.
- **Status.** queued

---

## Directions (surplus — read up)

### D1 — `connectionMode` flag written three times, read nowhere

- **Surplus.** `nav.svelte.js:22` declares `connectionMode` ("true when reached via a jump"),
  written at `:66/:110/:129`, but **read by no component** — grep finds no reader. The
  "jumped from" breadcrumb that `organizing-model.md:67` calls *optional* was never built; the
  flag that would drive it is dead state.
- **Rungs.** L4→L2: an implementation-level flag is fully maintained but delivers no behavior —
  the sideways-jump context it was meant to expose never reaches the user.
- **Who feels it.** After a connection jump, the user gets a fresh breadcrumb rooted at the
  target with no trace of where they jumped from — they lose their place and can't step back
  sideways.
- **Intent.** designed-latent — `organizing-model.md:67` explicitly scopes the "jumped from"
  crumb as optional/deferred, and the flag was wired in anticipation.
- **Loop.**
  ```
  Inventory every value nav.svelte.js maintains for the drill/jump state (path, connectionMode,
  #page, connections) and trace which reach a user through a component. Ledger
  ledgers/DARKDATA.md: value | written at | surfaced at | class (surfaced/internal/dark) | intent
  | verdict | commissioned as. Evidence from code and git only. Confirm connectionMode is dark
  (no reader across src/), and read its intent from organizing-model.md and git blame. Build and
  delete nothing. Done when every value is classified and every dark row holds its intent.
  ```
- **Strength.** Strong — write-with-no-read verified in code + explicit doc intent.
- **Status.** queued

### D2 — `blurhash` and `aspectRatio` normalized, never rendered

- **Surplus.** `model.js:100` normalizes `blurhash`, `model.js:99` normalizes `aspect_ratio`;
  no renderer references either (grep: typedef + assignment only). `ImageBlock` uses
  `object-fit: contain`; `EmbedBlock.svelte:39` hardcodes `aspect-ratio: 16/9`. Real per-image
  ratio and a progressive-load placeholder are captured, then dropped.
- **Rungs.** L4→L2: image metadata is modeled at L4 but the L2 render ignores it, so images
  reflow on load and embeds are forced to one ratio regardless of the block's real shape.
- **Who feels it.** The user watches images jump as they load (no blurhash placeholder, no
  reserved box) and sees non-16:9 embeds letterboxed or cropped.
- **Intent.** forgotten-latent — normalized alongside other fields with no reader and no comment
  deferring it (unlike D1's doc note).
- **Loop.**
  ```
  Inventory every field model.js normalizes onto NormBlock (model.js:90-125) and trace which
  reach a renderer. Ledger ledgers/DARKDATA.md: value | written at | surfaced at | class
  (surfaced/internal/dark) | intent | verdict | commissioned as. Evidence from code only —
  wildcard reads don't apply (renderers name fields explicitly). Confirm blurhash, aspectRatio,
  embedType are dark; read each one's intent from git blame and the design docs
  (embedding.md collapses embedType by design — mark that intent). Build nothing. Done when
  every normalized field is classified and every dark row holds its intent.
  ```
- **Strength.** Strong — two dark fields, write-with-no-read verified for both.
- **Status.** queued

### D3 — `embedType` persisted, unused (by design)

- **Surplus.** `model.js:122` stores `embed.type`; `EmbedBlock.svelte:7` renders purely off
  `embedHtml`. `embedding.md:40-52` states "one path for video *and* rich" — the discriminator
  was intentionally collapsed, yet the field is still written with no reader.
- **Rungs.** L4→L2: a discriminator modeled at L4 that L2 deliberately ignores.
- **Who feels it.** Nobody today — the single embed path works — but a future "different chrome
  for video vs link vs rich" feature would find the discriminator already captured.
- **Intent.** designed-latent — `embedding.md` records the deliberate collapse.
- **Loop.** Folded into D2's DARKDATA census (same ledger, one pass over normalized fields).
- **Strength.** Worth exploring — verified write-with-no-read; intent read from doc.
- **Status.** queued

### D4 — `getContentsPage(per=100)` — a pinned pagination dimension

- **Surplus.** `arena.js:65` — `per` defaults to 100 and no caller ever passes another value;
  nav paginates purely by incrementing `#page` (`nav.svelte.js:137`). A page-size knob exists
  and is pinned to one literal everywhere.
- **Rungs.** L4→L3: a parameterized page size no caller varies — headroom the product never
  cashes in.
- **Who feels it.** Nobody directly; the pinned 100 is the Are.na max-page convenience. Latent
  cost only: a reader assumes page size is tunable when it isn't.
- **Intent.** unknown — no comment or doc; likely convenience default matching the API's page
  cap. Also note `nextPage` (`arena.js:73`) is computed into the cache but never read (nav uses
  its own `#page`), a second pinned/dark artifact on the same path.
- **Loop.**
  ```
  Find every dimension arena.js/nav.svelte.js declares but pins to one value: getContentsPage's
  per (arena.js:65), the computed-but-unread nextPage (arena.js:73). Ledger ledgers/HEADROOM.md:
  dimension | declared | reached | pinned at | intent | verdict | commissioned as. Fill
  declared-vs-reached with grep evidence; read intent from comments and git. Build, unpin, and
  prune nothing. Done when every pinned row holds its intent.
  ```
- **Strength.** Speculative — one channel; intent unread until the loop runs.
- **Status.** queued

### D5 — Board view (thumbnail grid) — deferred, would-be-built → handed to graft

- **Surplus.** `organizing-model.md:39/95` explicitly defers an opt-in thumbnail grid for
  large/image-heavy channels; `model.js:6` carries an `unknown` Kind branch for the same
  eventual generality. The new `Cover.svelte` contact-sheet is adjacent but is a root-only
  home cover, not the per-channel Board.
- **Seam call.** The Board proper does not exist as latent capability — it would have to be
  **built** (a new per-channel grid view + its render path). Per the shared seam, that is graft's
  work, not tend's.
- **Status.** handed-to-graft: per-channel Board/thumbnail-grid view (surplus vantage:
  Cover.svelte + covers.js already provide a thumbnail-collection primitive to build on).

---

## Top recommendation

**Run I1 (unsanitized channel-description HTML) first.** It is the only Strong *security* issue,
it is the platform-gate check itself, and its canonicalization loop closes a real XSS surface
the design doc already flagged while unifying every `{@html}` sink onto one sanitized path.
While I1 stands unfixed, no growth (graft/direction verdicts) should converge — classify
directions freely, but build nothing until I1 is closed.

**Top direction:** D1 (`connectionMode`) — the strongest surplus: a fully-maintained flag with
a documented, deferred user-facing purpose (the "jumped from" crumb) sitting one wire from
delivery. Its dark-data census also sweeps up D2/D3/D4 in one pass.
