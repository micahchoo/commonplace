# Contributing to Commonplace

Thanks for your interest. Commonplace is a small, static Svelte 5 + Vite app — easy to run and
easy to reason about. This guide gets you from clone to pull request.

## Setup

```bash
git clone https://github.com/micahchoo/commonplace.git
cd commonplace
npm install
npm run dev          # → http://localhost:5173
npm test             # Vitest + jsdom
```

## Project layout

| Path | What lives there |
|---|---|
| `src/lib/` | Framework-free logic: the Are.na adapter (`arena.js`), block model (`model.js`), config, router, denylist, theme, sanitizer. Plain `.js` — except runes modules, which are `.svelte.js` (`nav.svelte.js`). |
| `src/components/` | Svelte components: the draggable `Panel`, the content `Stage`, `Cover`/`ThumbGrid`, and per-type renderers in `renderers/`. |
| `src/styles/global.css` | Theme tokens (`--an-*`) and styles for `{@html}`-injected content (scoped styles can't reach it). |
| `test/` | Vitest specs + real trimmed Are.na fixtures in `test/fixtures/`. |
| `docs/` | Human-facing design & research docs. |
| `.agents/docs/` | Agent-facing docs (audit, tracker conventions, build plan). |

## How we work

- **Tests first for logic.** Logic modules in `src/lib/` are covered by unit tests; components
  by jsdom render/smoke tests. Add or update a test with any behavior change — `npm test` must
  stay green.
- **Fixtures are shared.** Don't edit a fixture to make one test pass; add a new one. Changing a
  fixture means checking every consumer.
- **Small, focused PRs.** One concern per PR. Describe what changed and how you verified it.

## Conventions that matter

- **Sanitize all remote HTML.** Any Are.na- or config-authored HTML must pass through
  `sanitizeHtml` (`src/lib/sanitize.js`) before an `{@html}` sink. The canonical path for
  *about* text is the `Nav.about` getter. The **one exception** is embeds: their isolation is a
  sandboxed null-origin `<iframe srcdoc>`, not sanitization (sanitizing would strip the markup
  they need).
- **`DEPTH_CAP` is single-sourced** in `src/lib/router.js`. Import it; never redeclare it.
- **Runes modules end in `.svelte.js`.** Plain logic stays `.js`.
- **No secrets, ever.** This is a static build served to the browser; it can't hold a token.
  Public Are.na channels only.
- **Public channels & rate limits.** Respect the guest tier (30 req/min): cache in-session,
  paginate lazily, back off on `429`.

## Submitting a change

1. Branch off `master`.
2. Make the change; keep `npm test` and `npm run check` green.
3. Open a PR against [`micahchoo/commonplace`](https://github.com/micahchoo/commonplace) with a
   clear description and your verification steps.

By contributing, you agree your work is licensed under the same terms as the project (inherited
from [Binder](https://github.com/clementvalla/binder)).
