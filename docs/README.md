# Commonplace docs

Design and research notes behind the build. To *use* or *deploy* Commonplace, see the
[README](../README.md); to contribute, see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Design

- [framework.md](design/framework.md) — why Svelte 5 (runes) + Vite as a static SPA, and the framework gotchas that shaped the code.
- [organizing-model.md](design/organizing-model.md) — the navigation model: sections, nested-channel drill, breadcrumb, connections, hash routing.
- [embedding.md](design/embedding.md) — per-block rendering, the sanitize-vs-sandbox split, and the non-iframeable fallback strategy.
- [config.md](design/config.md) — runtime `config.json`, the `?channel=` override, and tokenized theming.
- [binder-arena-storyboard.md](design/binder-arena-storyboard.md) — the user journey, frame by frame.
- [name.md](design/name.md) — how the project became "Commonplace".

## Research

- [arena-v3-field-confirmation.md](research/arena-v3-field-confirmation.md) — **authoritative** Are.na V3 field map the block model normalizes from.
- [arena-api-v3.md](research/arena-api-v3.md) — earlier V2→V3 field-map research (superseded).
- [arena-public-api.md](research/arena-public-api.md) — earlier API overview (superseded).

Agent-facing docs (audit, tracker conventions, build plan) live in [`.agents/docs/`](../.agents/docs/).
