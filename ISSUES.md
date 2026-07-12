# ISSUES — Commonplace (tend)

> Generated 2026-07-11 · originally commit `ae5c299` (then repo `binder`, branch
> `arenotebook-build`; since renamed/rebranded to **Commonplace**, worked on `master`).
> Wayfinder map: **AreNotebook: health & surplus (tend 2026-07-11)** (`binder-d833`).
>
> All rows from the 2026-07-11 pass reached a terminal status and their lessons are stored
> (CLAUDE.md invariants + the ledgers below + each seeds ticket's `## Answer` + git history), so
> they are collapsed into the `## Decided` index. Full Evidence/Loop/Lesson for each live in git
> history and its seeds ticket — not restated here. A fresh re-run reads only the Decided index
> as its do-not-resurrect set and mines each rung past it.

## Decided

Issues (friction) — all `done 2026-07-11`, one fix commit + seeds `## Answer` each:

- I1 sanitize-remote-about-html — done — `binder-b680` — Nav.about is the one sanitized path; CLAUDE.md security invariant
- I2 cache-connections — done — `binder-be2a` — connCache in arena.js
- I3 reconcile-config.md-tokens — done — `binder-076c` — `--binder-*`→`--an-*` + historical banner
- I4 surface-connection-failures — done — `binder-265a` — console.warn on network swallow; parse-edges stay silent
- I5 cover-drag+renderers — done — `binder-c07b` — drag.js (6) + AttachmentBlock fork (5) + LinkBlock hatch (1)
- I7 document-params-config-gap — done — `binder-d725` — README + code comment; params mode is channels-only
- I8 single-source-DEPTH_CAP — done — `binder-726d` — nav imports from router.js; CLAUDE.md invariant
- I9 deletion-sweep — done — `binder-7261` — deleted 3 dead files + onHash/denylist() exports; model.js kept whole (ACL, not god-module)

Directions (surplus) — classify-only, `classified 2026-07-11`, verdicts deferred:

- D1 connectionMode-dark — classified — `binder-5717` — `ledgers/DARKDATA.md` — designed-latent ("jumped from" crumb)
- D2 blurhash/aspectRatio-dark — classified — `binder-e7ec` — `ledgers/DARKDATA.md` — forgotten-latent
- D3 embedType-dark — classified — `binder-6234` — `ledgers/DARKDATA.md` — designed-latent (collapsed by design)
- D4 per/nextPage-pinned — classified — `binder-01d9` — `ledgers/HEADROOM.md` — per=convenience default; nextPage=forgotten cursor

## Handed to graft

- **D5 Board view** (per-channel thumbnail grid) — `handed-to-graft`. Would have to be built, not
  tended; `Cover.svelte` + `covers.js` + `ThumbGrid.svelte` are the primitive to build on.
