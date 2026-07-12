# HARVEST — tend session 2026-07-11 (map binder-d833)

Session: charted the health-&-surplus wayfinder map, then resolved all 13 tickets (9 fix issues,
4 classify-only directions). Repo renamed binder → Commonplace mid-session; work continued on
`master`. Lessons figured out or corrected, restated as one-line rules, and where each is stored.

| lesson | rule | stored where |
|---|---|---|
| Remote Are.na HTML reached `{@html}` unsanitized via the channel description | All remote/external HTML passes through `sanitizeHtml` before any `{@html}` sink; the canonical path is `Nav.about` | CLAUDE.md § Security invariants + `nav.svelte.js` JSDoc |
| The drill-depth cap was declared in two modules and could drift | Shared invariants get one exported constant (`DEPTH_CAP` from router.js), never a re-declared literal | CLAUDE.md § Code invariants |
| A component `$effect` (matchMedia) renders after mount, so a sync test query saw the pre-effect DOM | Component tests exercising a `$effect` call `flushSync()` after `mount` before asserting | CLAUDE.md § Testing + `test/attachment.render.test.js` |
| A "god-module" by fan-in isn't necessarily a smell | A normalization / anti-corruption layer *should* have wide fan-in — that's cohesion, not a god-module; don't split reflexively | `binder-7261` answer + `ledgers/` (this decision) |
| Network failures were swallowed to safe-looking defaults (empty strip / empty config) | Surface network/API failures (console.warn min); parse-edge catches with safe defaults may stay silent | `binder-265a` answer; pattern applied in nav/config |
| Design docs are decision records, not live specs | Don't rewrite decision records to current tense; correct factual drift (stale token names) + add a historical banner pointing to the live doc | `binder-076c` answer |
| Directions classify surplus and stop | A direction ledger fills through `intent`; `verdict`/`commissioned as` stay empty for a later pass — no build in-loop | `ledgers/DARKDATA.md`, `ledgers/HEADROOM.md` |

Backlog compaction: all 13 rows terminal and lessons stored → collapsed into `ISSUES.md`
`## Decided` index. D5 (Board view) left as `handed-to-graft`. No rows left live.

Pruned: none — all rules added this session change future behavior (a fresh session writing an
`{@html}` sink, a shared cap, or a `$effect` component test trips over them).
