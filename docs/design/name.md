# Binder × Are.na — the name (decided: AreNotebook)

> Resolves **"Name the rebuilt tool — keep 'Binder' or rename?"** (`binder-c8c3`).
> Chosen by the maintainer, 2026-07-11.

## Decision

The rebuilt tool is **AreNotebook** (Are.na + notebook).

## Availability (verified 2026-07-11)

Fully clear — the best availability of any candidate considered:

- npm `arenotebook` — free
- `github.com/arenotebook` (org/user) — free
- `arenotebook.com` and `arenotebook.io` — both unregistered (NXDOMAIN)

## Caveat to weigh (flagged, not blocking)

- **Brand association / trademark:** the name derives from and leans on "Are.na." This is common for API-client tools, but it can imply official endorsement, and Are.na could object. If that's a concern, a "for Are.na" framing (a distinct name + "an Are.na browser") or a non-derived name sidesteps it. Worth a quick trademark sanity-check before the rebrand propagates.
- **Say-ability:** "AreNotebook" parses a little awkwardly spoken ("are notebook"); the camelCase carries it in text.

Nothing is built yet, so this is trivially reversible.

## Alternatives considered (brainstormed + vetted)

- **Keep Binder** — strong continuity default (fits; zero migration cost).
- **Sheaf** — a bound bundle of leaves + the math object that glues local scraps into one coherent whole (best conceptual fit).
- **Weft** — the crosswise thread of the woven menu.
- **Vitrine** — the full-viewport display-case pane.
- **Tessle** — the only other fully-clear namespace.

From a 32-candidate brainstorm across four lenses (binding / connective / window / brandable), deduped and availability-vetted (most dictionary names had npm + gh-org taken).

## Consequence

Rebrand Binder → AreNotebook (repo, docs, README, `binder-clip` assets) rides with the codebase migration.
