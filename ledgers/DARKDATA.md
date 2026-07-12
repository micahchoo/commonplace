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
| `connectionMode` | nav.svelte.js:74,122,141 (loadRoot/pop/jump); declared :23 | — no component reads it; grep `connectionMode` hits only nav.svelte.js writes | **dark** | **designed-latent.** The flag exists to drive the "jumped from" breadcrumb crumb that `docs/design/organizing-model.md:67` scopes as *optional* ("an explicit 'jumped from' crumb optional") on a sideways jump. Breadcrumb (`nav.breadcrumb`, :43) rebuilds fresh on jump and never consults the flag. Tested (nav.test.js:jump sets it true) but only the write is asserted. | | |
| `image.blurhash` | model.js:100 (from `img.blurhash`); typedef :11 | — no renderer reads it; ImageBlock uses a plain `<img>` | **dark** | **forgotten-latent.** Normalized alongside src/srcset/alt with no reader and no deferring comment. A blurhash placeholder (paint a blur while the image loads, avoiding reflow) was modeled but never rendered. No ADR or "phase 2" note — git shows it arriving with the normalizer, unused since. | | |
| `image.aspectRatio` | model.js:99 (from `img.aspect_ratio`); typedef :11 | — no renderer reads it. EmbedBlock:52 sets `aspect-ratio: 16/9` as a **CSS constant**, not the block's value; ImageBlock uses `object-fit`, so the real ratio is dropped | **dark** | **forgotten-latent.** Captured then discarded; images can reflow on load and the real per-image ratio never reserves a box. Same provenance as blurhash — modeled in `buildImage`, no reader, no deferral note. | | |
| `embedType` (`embed.type`) | model.js:122; typedef :14 | — EmbedBlock renders purely off `embedHtml`; no reader of the discriminator | **dark** | **designed-latent.** `docs/design/embedding.md` deliberately collapsed video and rich embeds onto "one path" (`embedHtml`), so the type discriminator is intentionally unused — kept in the model as the seam for a future "different chrome per embed type" without re-touching the normalizer. | | |

Second pass: no new rows. Every normalized `NormBlock` field re-checked for a reader —
`id/kind/title/image.src/thumb/srcset/alt/html/embedHtml/link.*/attachment.*/channelSlug/count`
all reach a renderer; only the four above are dark.
