# Commonplace — repo instructions

A 100% static Svelte 5 (runes) + Vite app that turns Are.na public channels into a
navigable site. Content comes from the Are.na V3 API at runtime; there are no secrets
(a static deploy can't hold one), so the trust boundary is the network response.

Health & surplus work is tracked as the wayfinder map **AreNotebook: health & surplus
(tend 2026-07-11)** (`binder-d833`); full evidence and runnable loops live in `ISSUES.md`.

## Security invariants

- **All remote or externally-authored HTML passes through `sanitizeHtml` (`src/lib/sanitize.js`)
  before any `{@html}` sink.** The canonical sanitized path for channel/config *about* text is
  the `Nav.about` getter (`src/lib/nav.svelte.js`) — never render a channel `description` or any
  Are.na-sourced string with `{@html}` without it. Embeds are the sole exception: their isolation
  is the sandboxed null-origin iframe, not sanitization (sanitizing would strip the markup they
  need). See `ISSUES.md#I1`.

## Code invariants

- **`DEPTH_CAP` is defined once, in `src/lib/router.js`, and imported everywhere it's needed
  (nav, router).** Never redeclare it — the drill-depth cap and the hash-encoding cap must not
  drift. See `ISSUES.md#I8`.
