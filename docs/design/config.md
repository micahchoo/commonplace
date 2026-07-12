# Self-hosting config & theming

Commonplace is a fully static build: it ships with no baked-in content and no
build step for the site owner. What a site shows and how it looks are decided at
runtime by a `config.json` file (and, optionally, a URL parameter). This doc
describes that config schema, the `?channel=` zero-config override, and the
tokenized `--an-*` theming system. Read it if you're deploying your own
Commonplace or want to understand how content and look get resolved at boot.

The relevant code is [`src/lib/config.js`](../../src/lib/config.js) (channel
resolution), [`src/lib/theme.js`](../../src/lib/theme.js) (theme application),
and [`src/styles/global.css`](../../src/styles/global.css) (token defaults).

## `config.json`

Drop a `config.json` next to `index.html`. It's fetched at runtime, so you edit
and reload — no rebuild. All fields except `channels` are optional:

```json
{
  "title": "My Commonplace",                  // panel header + document.title
  "about": "A little collection.",            // folded into the panel header
  "logo": "logo.png",                         // small mark in the panel header
  "channels": ["reading-room", "field-work"], // REQUIRED — ordered Are.na slugs = the sections
  "theme": {                                  // optional overrides; omit for the signature look
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

`channels` is an ordered list of Are.na channel slugs; each slug becomes a
section, in order. Entries may be bare slugs **or** full `are.na/…/slug` URLs —
`extractSlug` (in [`model.js`](../../src/lib/model.js)) takes the last path
segment of any `are.na` URL and strips stray slashes off a bare slug. There is
no auth/token field: Commonplace reads public channels only, so `config.json`
holds no secrets.

The shipped [`public/config.json`](../../public/config.json) is a minimal live
example — `title`, `about`, and a single channel, no `logo` or `theme`.

## Channel resolution: `?channel=` and precedence

`resolveConfig(location.search)` picks the channel list from the first source
that yields at least one valid slug:

1. **URL params** — `?channels=a,b,c` (or singular `?channel=slug`). `channels`
   wins over `channel` if both are present. This enables a **zero-config static
   deploy**: host the build once, then point anyone at
   `?channel=their-slug`. If the param is present but resolves to no valid slugs,
   resolution falls through to the next source.
2. **`config.json` → `channels`**, when the file loads and has a non-empty list.
3. else a friendly **"configure me"** empty state — never a crash or blank page.

Params mode is **channels-only by design**: `title`, `about`, `logo`, and
`theme` are `config.json`'s job, so a `?channel=` load always uses the default
look and ignores those fields even if a `config.json` sits alongside. This is a
known sharp edge — see I7 in the [audit](../../.agents/docs/ISSUES.md).

A missing `config.json` is legitimate (it's exactly the zero-config `?channel=`
case), so a failed fetch is not an error. But the failure is still surfaced via
`console.warn` rather than silently swallowed, so that a **malformed**
`config.json` (a JSON parse error) leaves a clue instead of collapsing wordlessly
into the empty state — see I4 in the [audit](../../.agents/docs/ISSUES.md).

## Theming — the `--an-*` tokens

The signature look — the offset box-shadow, blue border, monospace type — is not
hardcoded. It lives as CSS custom properties on `:root` in
[`global.css`](../../src/styles/global.css), with the classic values as
defaults. These defaults live in a **global** stylesheet, not a Svelte
component, because component-scoped styles don't reach `{@html}`-injected content
(rendered Text and embeds).

| Token | Default (signature) | Role |
|---|---|---|
| `--an-panel-bg` | `#eee` | panel background |
| `--an-border` | `blue` | panel border |
| `--an-shadow-1` | `#fefb00` | box-shadow, +3px offset |
| `--an-shadow-2` | `#ff0000` | box-shadow, +6px offset |
| `--an-font` | `monospace` | body / panel font |
| `--an-text` | `#717171` | body text color |
| `--an-accent` | `#000` | active row / links |

Note the token *keys* you write in `config.theme` are **unprefixed**
(`panel-bg`, `shadow-1`, …); `theme.js` maps each to its `--an-*` custom
property. `applyTheme(theme)` iterates that map and, for each provided key, calls
`documentElement.style.setProperty` to override the default. Omit `theme`
entirely and you get the exact classic Binder look; override any subset to
restyle.

### Value checking

`config.json` is the self-hoster's own same-origin file — trusted input, not a
security boundary — but each theme value is still shape-checked before injection
to avoid silently breaking layout or leaking stray CSS. `isValidToken` accepts a
value only when it is:

- a string,
- non-empty after trimming,
- shorter than 64 characters, and
- free of the characters `{ } < > ;`.

This is a denylist guard, **not** a CSS validator: it does not confirm the value
is a well-formed color, length, or font. A clean-but-nonsensical value like
`"notacolor"` passes and simply produces a broken style; a value containing a
semicolon or braces is dropped and the token keeps its default.

## Migrating from Binder's `info.json`

Commonplace's `config.json` supersedes Binder's `info.json`. Three fields carry
over unchanged; the fourth is a content-model shift, not a rename:

| `info.json` (Binder) | `config.json` (Commonplace) |
|---|---|
| `title` | `title` |
| `about` | `about` |
| `logo` | `logo` |
| `menu: { Name: URL, … }` | `channels: [slug, …]` — **content-model shift** |

Binder's `menu` listed arbitrary URLs directly. Commonplace instead sources all
content from Are.na, so there is no automatic converter — porting a site *is* the
work of moving content into Are.na. Create an Are.na channel, add your links and
content as blocks (each old menu URL becomes a Link block), and list the channel
slug in `channels`. Multiple old menu sections become multiple channels.

## Notes for self-hosters

- With no `config.json` and no URL param, you land on the "configure me" empty
  state, not an error.
- Are.na's guest (tokenless) API rate limit applies — roughly 30 requests/minute.
  For a small, cached channel this is rarely felt, but it's the ceiling for a
  public, secret-free deploy.

For where config loading sits in the overall build, see the build plan under
[`.agents/docs/plans/`](../../.agents/docs/plans/2026-07-11-arenotebook-build.md).
