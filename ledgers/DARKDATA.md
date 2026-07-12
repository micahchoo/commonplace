# DARKDATA — dark-data census (tend directions D1/D2/D3)

Classify-only. Every value below is written/computed but traced to no user surface (screen,
API response, export, email, webhook). Evidence from code + git only. `verdict` and
`commissioned as` stay empty — a direction loop classifies and reads intent, then stops; verdicts
come later, outside the run. Done: every value classified (a second pass adds no rows) and every
dark row holds its intent.

Ledgers cover binder-5717 (connectionMode), binder-e7ec (blurhash/aspectRatio), binder-6234 (embedType).
Commit examined: post-rebrand master (b44fcab).

| value | written at | surfaced at | class | intent | verdict | commissioned as |
|---|---|---|---|---|---|---|
| `connectionMode` | was nav.svelte.js (loadRoot/enter/jump); declared :23 | never read — AND `jump()` itself was never called in-app | **dark → deleted** | **designed-latent, but unreachable.** Deeper finding: `nav.jump()` is never invoked — the connections strip routes `onjump → navigate([slug]) → hash → sync() → enter()`, which sets the flag false. The hash encodes only the destination, so a jump and a root-entry are indistinguishable after a round-trip; that's *why* the router collapses them. So the flag was always false and `jump()` was test-only. **Verdict (2026-07-12, user): DELETE** — speculative generality never cashed in; the connections strip is unaffected (works via enter). A future "jumped from" crumb would need hash-encoded origin (graft). | **delete** | removed connectionMode + jump() |
| `image.blurhash` | model.js:100 (from `img.blurhash`); typedef :11 | now `Blurhash.svelte` in ImageBlock + ThumbGrid | **dark → surfaced** | **forgotten-latent.** Normalized alongside src/srcset/alt with no reader. **Commissioned (2026-07-12):** `src/lib/blurhash.js` (dep-free decoder) + `Blurhash.svelte` paint an instant blurred preview behind the image (full-viewport backdrop in ImageBlock; per-cell in the grid), image fades in on load. | **surface** | blurhash placeholder — `blurhash.js` + `Blurhash.svelte`, wired in ImageBlock/ThumbGrid/covers |
| `image.aspectRatio` | model.js:99 (from `img.aspect_ratio`); typedef :11 | now `Blurhash` uses it to shape the preview buffer | **dark → surfaced (partial)** | **forgotten-latent.** **Commissioned (2026-07-12):** consumed by `Blurhash.svelte` to size the decode buffer so the blur isn't distorted. NOT used for reflow-prevention — both image surfaces are fixed slots (full-viewport absolute; fixed 96px grid cells), so nothing reflows; that use has no payoff here. | **surface (as blur shaping only)** | passed as `ratio` to `Blurhash` |
| `embedType` (`embed.type`) | model.js:122; typedef :14 | now EmbedBlock frames by type | **dark → surfaced** | **designed-latent.** `embedding.md` collapsed video+rich onto one `embedHtml` path, keeping the discriminator as a seam. **Commissioned (2026-07-12):** the seam is cashed in — a `rich` embed gets a neutral, taller frame (`.rich`, white srcdoc bg) instead of being force-cropped into the black 16:9 video letterbox; `video`/unknown stay cinematic. Rich dimensions (3/4) are heuristic — verify against real Are.na rich embeds. | **surface** | type-driven framing in EmbedBlock (`.rich`) |

Second pass: no new rows. Every normalized `NormBlock` field re-checked for a reader —
`id/kind/title/image.src/thumb/srcset/alt/html/embedHtml/link.*/attachment.*/channelSlug/count`
all reach a renderer; only the four above are dark.
