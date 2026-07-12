# Commonplace — repo instructions

A 100% static Svelte 5 (runes) + Vite app that turns Are.na public channels into a
navigable site. Content comes from the Are.na V3 API at runtime; there are no secrets
(a static deploy can't hold one), so the trust boundary is the network response.

Agent-facing documentation lives under **`.agents/docs/`**: the health-&-surplus audit
(`ISSUES.md`), the seeds/wayfinder tracker conventions (`issue-tracker.md`), and the original
build plan (`plans/`). Health & surplus work is tracked as the wayfinder map `binder-d833`.

## Security invariants

- **All remote or externally-authored HTML passes through `sanitizeHtml` (`src/lib/sanitize.js`)
  before any `{@html}` sink.** The canonical sanitized path for channel/config *about* text is
  the `Nav.about` getter (`src/lib/nav.svelte.js`) — never render a channel `description` or any
  Are.na-sourced string with `{@html}` without it. Embeds are the sole exception: their isolation
  is the sandboxed null-origin iframe, not sanitization (sanitizing would strip the markup they
  need). See `.agents/docs/ISSUES.md#I1`.

## Code invariants

- **`DEPTH_CAP` is defined once, in `src/lib/router.js`, and imported everywhere it's needed
  (nav, router).** Never redeclare it — the drill-depth cap and the hash-encoding cap must not
  drift. See `.agents/docs/ISSUES.md#I8`.
