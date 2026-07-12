# HEADROOM — headroom audit (tend direction D4)

Classify-only. Dimensions the code declares but the product pins to one value, plus computed
values persisted then dropped. Evidence from grep + git. `verdict`/`commissioned as` stay empty
(verdicts come later). Done: every pinned/dropped row holds its intent (a second pass adds no rows).

Covers binder-01d9. Commit examined: post-rebrand master (b44fcab).

| dimension | declared | reached | pinned at | intent | verdict | commissioned as |
|---|---|---|---|---|---|---|
| `per` (page size) | `getContentsPage(slug, page=1, per=100)` arena.js:66; interpolated into the `?per=` query :68 | **no** — every caller uses the default: covers.js:12 `(slug,1)`, nav.svelte.js:84 `(slug,1)`, :150 `(slug,#page)`. No call passes `per` | pinned to `100` at every call site | **unknown → convenience default.** No comment/ADR; 100 matches Are.na's max page size, so lazy pagination fetches whole pages. The knob is real (a smaller `per` for faster first paint, or a render cap for huge channels — `organizing-model.md:75` mentions a "list render cap") but no path varies it. Not user-facing; latent cost is a reader assuming page size is tunable. | | |
| `nextPage` | computed into the page-cache result: arena.js:74 (`j.meta?.next_page`), cache shape documented :27 | **no reader** — nav paginates with its own `this.#page += 1` (nav.svelte.js:149) and never reads `nextPage`. Asserted in arena.test.js but consumed by no production code | n/a (computed-then-dropped, not pinned) | **forgotten-latent.** A server-driven cursor was captured but nav rolled its own page counter instead, leaving `nextPage` as dead payload on every cached page. Harmless; a candidate to either wire (trust the server cursor) or drop from the cache shape. | | |

**Parked 2026-07-12** (user directive): D4 verdicts deferred — neither `per` nor `nextPage`
acted on. `per=100` is a harmless working default; `nextPage` is dead cache payload with no
urgency. Revisit if a render cap / faster-first-paint need arises, or fold `nextPage` into a
future arena.js cleanup.

Second pass: no new rows. Other value-spaces checked and NOT pinned — `config.channels`/`theme`
(user-supplied), block `kind` (all 6 V3 types constructed), `state` filter (`isAvailable`), the
denylist set (multiple hosts). Only `per`/`nextPage` on the pagination path qualify.
