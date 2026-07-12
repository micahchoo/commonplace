# Binder × Are.na — self-hosting config & theming (decided)

> **Status:** a build-time decision record. The tool shipped as **Commonplace** (V3 API); the
> current self-hosting guide is `README.md`. The CSS custom properties below were finalized with
> the `--an-*` prefix (see `src/lib/theme.js`), not `--binder-*` — corrected inline. The `theme`
> *keys* a self-hoster writes in `config.json` are unprefixed and unchanged.

> Resolves **"Design the self-hosting config: site meta, channel list & theming"** (`binder-5299`).
> Builds on the organizing model (a site = ordered channel slugs), the framework (Svelte 5 + Vite),
> and the API decision (Are.na V3). Theming fork settled by grilling on 2026-07-11.

## Decisions

- **Delivery: a runtime-fetched `config.json`** dropped next to `index.html` — edit-and-reload, **no rebuild** (matches the runtime-fetch, no-build-data ethos). **Plus** a `?channel=slug` / `?channels=a,b,c` **URL override** for a zero-config / shareable mode.
- **Theming: the signature look is the default, fully tokenized.** The classic box-shadow / monospace identity ships as the default via CSS custom properties; `config.theme` overrides them for a full restyle.
- **No auth/token field** — consistent with the standing "public channels only, no secrets" decision.
- **Migration:** `config.json` supersedes `info.json`; `title`/`about`/`logo` carry over, but the `menu` (name→URL) → `channels` (Are.na slugs) is a **content-model shift**, not a field rename.

## `config.json` schema

```json
{
  "title": "My Binder",                    // optional — panel header + document.title
  "about": "A little collection.",         // optional — folded into the panel header
  "logo": "logo.png",                      // optional — small mark in the panel header
  "channels": ["reading-room", "field-work"], // REQUIRED — ordered Are.na channel slugs = the sections
  "theme": {                               // optional — overrides; omit for the signature look
    "panel-bg": "#eee",
    "border": "blue",
    "shadow-1": "#fefb00",
    "shadow-2": "#ff0000",
    "font": "monospace",
    "text": "#717171",
    "accent": "#000"
  }
}
```

`channels` accepts bare slugs **or** full `are.na/…/slug` URLs (extract the slug) for friendliness. A section slug that's private/404 degrades per the organizing model (render the reachable sections, mark the dead one).

## Resolution precedence (channels)

1. `?channel=slug` / `?channels=a,b,c` URL params, if present — enables a **zero-config static deploy**: host the build once, point anyone at `?channel=their-slug`.
2. else `config.json` → `channels`.
3. else a friendly **"configure me"** empty state (never a crash / blank).

`config.json` itself may be missing or fail to fetch → fall through to the empty state.

## Theming — the tokens

The signature identity lives as CSS custom properties on `:root` in a **global** stylesheet (not a Svelte component — scoped styles don't reach `{@html}` content, per the framework decision), with the classic values as defaults:

| Token | Default (signature) |
|---|---|
| `--an-panel-bg` | `#eee` |
| `--an-border` | `blue` |
| `--an-shadow-1` | `#fefb00` (offset +3px) |
| `--an-shadow-2` | `#ff0000` (offset +6px) |
| `--an-font` | `monospace` |
| `--an-text` | `#717171` |
| `--an-accent` | `#000` (active row) |

At boot, `config.theme` sets these via `documentElement.style.setProperty`. Omitting `theme` yields the exact classic Binder look; overriding any subset restyles it. Values are **validated to expected CSS shapes** before injection — `config.json` is the self-hoster's own, same-origin file (trusted, not a security boundary), but shape-checking avoids silent layout breakage.

## Migration from `info.json`

| `info.json` (old) | `config.json` (new) |
|---|---|
| `title` | `title` |
| `about` | `about` |
| `logo` | `logo` |
| `menu: { Name: URL, … }` | `channels: [slug, …]` — **content-model shift** |

The old `menu` listed arbitrary URLs directly; the new model sources content from Are.na. **How to migrate:** create an Are.na channel, add your links/content as blocks (each old menu URL becomes a Link block), and list the channel slug(s) in `channels`. Multiple old sections → multiple channels. There is no automatic converter — the shift from "arbitrary URLs" to "Are.na channels" is the whole point of the rebuild; document it in the README.

## Edge cases / risks

- Missing/failed `config.json` and no URL param → the "configure me" empty state.
- Guest **rate limit (30/min)** applies (no token by decision); documented for self-hosters. A power-user *could* hardcode their own token in their own deploy at their own risk — unsupported, and it re-introduces the secret-exposure the project rejected.
- `theme` values are self-authored/same-origin (trusted); still validate shapes.

## Ties into

- **Framework** (`binder-c14b`): theme tokens as CSS vars in the global stylesheet.
- **V3** (`binder-d4d4`): `channels` slugs feed `GET /v3/channels/:slug`.
- **Codebase migration** (fog): config loading + the `info.json`→`config.json` cutover is part of the build.
