# Framework & build: Svelte 5 (runes) + Vite as a static SPA

Commonplace is a rebuild of [Binder](https://github.com/clementvalla/binder) as a
100% static single-page app: `vite build` emits a `dist/` of `index.html` plus
content-hashed JS/CSS with no server, and the app fetches public Are.na channels at
runtime in the browser. This doc explains why the stack is Svelte 5 (runes) + Vite,
and — more usefully if you're reading the code — the handful of framework quirks that
shaped how the code is written. Read it before you touch the nav state machine, the
`{@html}` renderers, the arena cache, or routing.

## Why Svelte 5 + Vite

Two of Binder's hardest parts drove the pick. The first is a **reactive nested-nav
tree** — a drill stack with a breadcrumb, sideways "connections" jumps, and an active
block — which runes model cleanly as plain reactive fields (`src/lib/nav.svelte.js`).
The second is the **signature scoped-CSS panel**: Svelte's component-scoped styles keep
Binder's box-shadow panel aesthetic pixel-faithful without a global-CSS naming
discipline. Vite gives a dead-simple static build (`vite build` → `dist/`, deployable to
any static host) and compiles both `.svelte` and `.svelte.js` for tests via the same
plugin.

The honest tradeoff is bundle size: Svelte's runes runtime floor (~10 kB gzip) is a few
kB heavier than a Preact-plus-signals baseline (~6 kB). For a self-hosted static app that
delta is negligible, and Svelte was chosen for authoring ergonomics and its
reactivity-plus-styling fit rather than minimum bytes.

Alternatives that were weighed and set aside:

| Option | Why not |
|---|---|
| Preact (+ signals) | Smallest familiar runtime, largest contributor pool — but style-scoping is by convention (CSS Modules), plus a hooks-vs-signals duality |
| SolidJS | Excellent fine-grained reactivity + scoped CSS at ~7 kB, but a niche skill set and smaller community |
| Lit | Browser-primitive longevity, but Shadow DOM adds a boundary around the full-viewport panel |
| Astro | A static-site generator pointed at the wrong shape — a runtime-fetch SPA collapses to one `client:only` island, and its ClientRouter fights hash routing |

Some of Binder's distinctive features are framework-neutral and don't favor any of these:
the draggable panel is native **Pointer Events** (`src/lib/drag.js`, replacing jQuery-UI +
touch-punch), routing is native **`onhashchange`**, and **DOMPurify** (~+10 kB gzip) is a
shared cost every candidate would pay. So the decision came down to reactivity and styling
ergonomics.

## Framework gotchas that shaped the code

Five Svelte 5 behaviors leave visible marks on the codebase. Knowing them makes the code
read as deliberate rather than arbitrary.

### Scoped styles don't reach `{@html}`, so text is styled globally

Svelte scopes component CSS by hashing selectors at compile time; that hashing can't reach
markup injected at runtime through `{@html}`. The Text renderer
(`src/components/renderers/TextBlock.svelte`) injects DOMPurify-sanitized Are.na HTML —

```svelte
const clean = $derived(sanitizeHtml(block.html));
...
<div class="at-text">{@html clean}</div>
```

— so its typography can't live in the component. It lives in `src/styles/global.css` under
`.at-text`, imported once in `src/main.js`. (The renderer's normalized field is `html`,
sourced from the V3 block's `content.html`.)

The Media embed looks similar but is a different mechanism, not a CSS workaround.
`EmbedBlock.svelte` puts third-party embed HTML into a sandboxed null-origin
`<iframe srcdoc>`. That iframe is a document boundary — it's isolated from all parent CSS
by design — and its content is deliberately **not** run through DOMPurify, because the
sandbox is the isolation and DOMPurify would strip the `<iframe>`/`<script>` the embed
needs.

### The channel cache is a `SvelteMap`, not a plain `Map`

`src/lib/arena.js` — the one seam to the Are.na V3 API — keys its three caches on
`SvelteMap` from `svelte/reactivity`:

```js
const metaCache = new SvelteMap(); // slug -> meta
const pageCache = new SvelteMap(); // `${slug}:${page}` -> { blocks, hasMore, nextPage }
const connCache = new SvelteMap(); // slug -> { channels }
```

Mutations to a plain `Map` are invisible to the runes reactivity system, so a cached
channel would never reflect into derived UI — an easy subtle bug when wiring the
drill/breadcrumb to cached results. `SvelteMap.set` notifies subscribers. Note that
`arena.js` is a plain `.js` module: `SvelteMap` is an ordinary class import and needs no
runes syntax.

### Hash routing is hand-rolled

`src/lib/router.js` is pure `encodePath`/`decodeHash` functions plus a thin `navigate()`
that sets `window.location.hash`. The hash is the single source of truth: user actions set
the hash, and `App.svelte` reconciles nav to it in a `sync()` function wired via
`window.addEventListener('hashchange', sync)` in `onMount` — not through an `$effect`.
Deep-links key on stable block **id** (`#a/b/c/b:47749402`) so reordering blocks in Are.na
doesn't break shared links, and the path is depth-capped at `DEPTH_CAP = 8`. No SvelteKit —
it's backend-shaped and overkill for a no-server static app.

### The reactive-class rule: instantiate once, read fields off the instance

A class whose fields are `$state` must live in a `.svelte.js` file, be instantiated once,
and have its fields read directly off the instance. `App.svelte` does exactly this:

```js
const nav = new Nav(); // NOT $state — reassigning a reactive instance severs
                       // its class-field reactivity
```

Consumers read `nav.path`, `nav.blocks`, `nav.active` directly, and `$derived` in
`App.svelte` tracks them. Wrapping the instance in `$state` (or destructuring its reactive
fields into locals) would snapshot the values and break the live connection.

### `.svelte.js` for runes modules

Runes (`$state`, `$derived`, `$effect`) only compile inside `.svelte` and `.svelte.js`
files. That's the whole reason the nav state machine is `src/lib/nav.svelte.js`: it holds
`$state` fields. Modules that don't use runes — `arena.js`, `router.js`, `model.js`,
`sanitize.js` — stay plain `.js`. Keep runes usage consistent (avoid mixing legacy `$:` /
stores) so the code stays legible.

### Client-renders: a skeleton covers first paint

A runtime-fetch SPA is blank until JS runs. `App.svelte` shows a skeleton panel until the
first load resolves:

```svelte
{#if !booted}
  <div class="at-panel at-skeleton"><p>Loading…</p></div>
```

Prerendering via `adapter-static` is an optional later add, not needed for this shape.

## Build setup

- **`vite.config.js`** — `plugins: [svelte()]` and `base: './'`, so content-hashed assets
  resolve under subpath hosting (GitHub Pages project pages) and `file://`. `vite build`
  produces a static `dist/` deployable to any static host.
- **Entry** — `src/main.js` runs `mount(App, { target: document.getElementById('app') })`
  and imports `./styles/global.css`.
- **DOMPurify 3.x** (`dompurify` dependency) sanitizes the Text renderer's HTML; the
  sanitizer itself is framework-independent (`src/lib/sanitize.js`).
- **Dropped** the legacy jQuery / jQuery-UI / touch-punch / modernizr stack; the draggable
  panel is reimplemented with native Pointer Events and `setPointerCapture` in
  `src/lib/drag.js`.

## Testing

`vitest.config.js` reuses the Svelte plugin (with HMR off) so Vitest compiles both
`.svelte` components and `.svelte.js` runes modules. Tests run under `jsdom` (giving
DOMPurify and component code a DOM), and `resolve.conditions: ['browser']` selects Svelte's
client build so `mount()` works instead of resolving the SSR build.

## Related

- Build plan: [`.agents/docs/plans/2026-07-11-arenotebook-build.md`](../../.agents/docs/plans/2026-07-11-arenotebook-build.md)
- Known-issues audit: [`.agents/docs/ISSUES.md`](../../.agents/docs/ISSUES.md)
- Are.na V3 field mapping: [`../research/arena-v3-field-confirmation.md`](../research/arena-v3-field-confirmation.md)
