# Binder × Are.na — framework & build (decided: Svelte 5 + Vite)

> Resolves **"Choose the framework and build setup"** (`binder-c14b`).
> Chosen by the maintainer; a blind 5-way evaluation (below) informs the rationale and the
> Svelte-specific gotchas to design around.

## Decision

**Svelte 5 (runes) + Vite** (`@sveltejs/vite-plugin-svelte`), emitting a **static SPA** — `dist/` = `index.html` + content-hashed JS/CSS, no server. Entry: `mount(App, { target })`.

## Why — and the honest tradeoff

Svelte 5 is a near-ideal fit for Binder's two hardest parts: the **reactive nested-nav tree** (runes model the path/breadcrumb/drill state cleanly) and the **signature scoped-CSS panel** (component-scoped styles keep the box-shadow aesthetic pixel-faithful), with a dead-simple Vite static build (~80 ms; ~14.8 kB gzip for a Binder-shaped app before DOMPurify).

Transparently: the blind eval ranked **Preact marginally higher (53 vs 49)**, driven by size (Svelte's ~10 kB gzip runes runtime floor vs Preact's ~6 kB) and contributor pool. Svelte was chosen for authoring ergonomics + reactivity/styling fit — a legitimate deciding factor the judge endorsed. The size delta (~4 kB gzip) is negligible for a self-hosted static app, and Svelte's only weak axis was size (6/10); it scored 9 on static-output, reactivity, and styling.

## The 5-way evaluation (blind, scored /60)

| Framework | Total | One-line |
|---|---|---|
| Preact (+signals) | 53 | Smallest familiar runtime, largest contributor pool; style-scoping by convention (CSS Modules), hooks-vs-signals duality |
| SolidJS | 51 | Best fine-grained reactivity + scoped CSS at ~7 kB; niche skill, smaller community |
| Lit | 51 | Browser-primitive longevity; but Shadow DOM adds a boundary around the full-viewport iframe |
| **Svelte 5 (chosen)** | 49 | Near-ideal reactivity + scoped-styling fit, trivial Vite static build; ~10 kB runes floor is its only weak axis |
| Astro | 37 | Best SSG pointed at the wrong shape — a runtime-fetch SPA collapses to one `client:only` island; ClientRouter fights hash routing |

**Framework-neutral facts** (no framework wins or loses on these): the signature **drag** is native **Pointer Events** (replacing jQuery-UI + touch-punch); **routing** is native **`onhashchange`**; **DOMPurify** (~+10 kB gzip) is a shared cost every candidate pays equally. So the pick was about reactivity/styling ergonomics, not Binder's distinctive features.

## Svelte-specific gotchas to design around (from the eval)

- **Scoped styles don't reach `{@html}` content** — the DOMPurify'd Text `content_html` and the Media `srcdoc` get no component-scoped CSS; style those two renderers via `:global()` or a plain global stylesheet.
- **The channel cache must be a `SvelteMap`** (`svelte/reactivity`), not a plain `Map` — plain-Map mutations are invisible to the runes reactivity system, an easy subtle bug when wiring the drill/breadcrumb to cached channels.
- **Hand-roll hash routing** (`$effect` + `onhashchange`, deep-link by block id) — do **not** pull SvelteKit (backend-shaped, overkill for a no-server static app).
- **Client-renders (blank until JS runs)** — the organizing model's planned skeleton box covers first paint; `adapter-static` prerender is an optional later add, not needed now.
- **Runes churn** — pin versions and use runes consistently (avoid mixing legacy `$:`/stores) to keep the code legible for a future maintainer.

## Build setup

- `vite.config.js`: `plugins: [svelte()]`; `vite build` → static `dist/` (deployable to any static host — GitHub Pages / Netlify / plain nginx; feeds the deployment fog).
- **DOMPurify 3.x** for the Text/embed sanitization (framework-independent).
- **Drop** jQuery / jQuery-UI / touch-punch / modernizr; reimplement the draggable panel with native Pointer Events.

## What this unblocks

- **Codebase migration** (fog) now has a target stack: scaffold Svelte + Vite, port the iframe host + hash routing, wire the per-class renderers + DOMPurify + sandbox, reimplement drag. (Also waits on the config decision, `binder-5299`.)
- **Deployment story** (fog): the static `dist/` drops onto any static host.
