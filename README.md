# AreNotebook

A self-hostable, **100% static** web app that turns [Are.na](https://www.are.na)
public channels into a navigable site — a floating, draggable menu over a
full-viewport content pane. Point it at a channel and browse its blocks: images,
text, links, embeds, PDFs, and nested channels, each rendered in place.

It is the modern rebuild of [Binder](https://github.com/clementvalla/binder):
same signature look (the double-shadow monospace box), but content now comes from
Are.na at runtime instead of a hand-edited link list, and the stack is Svelte 5 +
Vite with no jQuery.

## Quick start

```bash
npm install
npm run dev        # local dev server
npm run build      # → dist/ (static files, deploy anywhere)
```

Edit **`config.json`** to point at your own Are.na channels, then reload. No rebuild
needed — `config.json` is fetched at runtime.

## `config.json`

Dropped next to `index.html`:

```json
{
  "title": "My Notebook",
  "about": "A little collection.",
  "logo": "logo.png",
  "channels": ["reading-room", "field-work"],
  "theme": {
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

| Field | Required | Notes |
|---|---|---|
| `channels` | **yes** | Ordered Are.na channel slugs = the site's top-level sections. Full `are.na/…/slug` URLs also accepted. |
| `title` | no | Panel header + browser tab title. |
| `about` | no | Folded into the panel header. |
| `logo` | no | Small mark in the header. |
| `theme` | no | Overrides the signature look; omit for the classic Binder style. |

**Zero-config mode:** skip `config.json` entirely and open the built app with a URL
parameter — `?channel=reading-room` or `?channels=a,b,c`. Handy for a hosted build
anyone can point at their own channel.

Only **public** channels work (channels marked *public* or *closed* — not *private*).
There are no auth tokens: a static deploy can't hold a secret.

## Migrating from Binder

Binder's `info.json` listed a `menu` of name → URL. AreNotebook sources content from
Are.na instead, so the model shifts from "arbitrary links" to "channels of blocks":

1. Create an Are.na channel (make it public).
2. Add your links, images, and notes to it as blocks — each old menu URL becomes a
   Link block.
3. List the channel slug(s) in `config.json` under `channels`. Several old sections →
   several channels.

`title` / `about` / `logo` carry over unchanged; `menu` has no direct equivalent —
that's the point of the rebuild.

## How it works

- The site's **sections** are the configured channels. Each is a numbered index of its
  blocks; a nested channel appears as a `>ch N` drill node; a `<-> connected` strip
  offers sideways jumps to related channels.
- Selecting a block renders it in the full-viewport pane by type: `<img>` for images,
  sanitized HTML for text, a sandboxed embed for media, a PDF viewer / download for
  attachments, and an iframe for links.
- Some sites refuse to be framed (NYT, Twitter/X, GitHub, …). Those show a preview card
  with an **"open in new tab ▸"** link instead of a blank frame; every link view keeps
  that escape hatch.
- Deep links work: the URL hash encodes the drill path and the open block's id, so any
  view is shareable and the back button behaves.

## Rate limits

Unauthenticated Are.na access is **30 requests/minute** (guest tier). AreNotebook stays
within it by caching channels in-session, loading pages lazily ("load more"), and backing
off on `429`. Heavy, rapid drilling can still hit the ceiling; it recovers on its own.

## Deploy

`npm run build` emits a static `dist/` — `index.html` plus hashed JS/CSS. Drop it on any
static host:

- **GitHub Pages / any subpath host:** works as-is. Assets use relative paths
  (`base: './'` in `vite.config.js`), so a project page at `user.github.io/repo/` resolves
  correctly.
- **Netlify / Vercel / S3 / nginx:** serve `dist/` as static files.

`npm run preview` serves the production build locally to smoke-test before deploying.

## Development

```bash
npm test           # unit + component tests (Vitest + jsdom)
npm run check      # svelte-check
```

- Stack: Svelte 5 (runes) + Vite, DOMPurify for text sanitization, native Pointer Events
  for the draggable panel.
- The Are.na V3 field map lives in `docs/research/arena-v3-field-confirmation.md`; the
  design decisions behind the rebuild are in `docs/design/`.

## A note on the name

AreNotebook is an **independent** Are.na browser. It is not affiliated with, endorsed by,
or sponsored by Are.na — it just uses their public API. "Are.na" is a trademark of its
owners.

## Credits & license

A rebuild of [Binder](https://github.com/clementvalla/binder) by Clement Valla. Inherits
the upstream project's license.
