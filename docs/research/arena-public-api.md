# Are.na public API — research (for Binder)

> Resolves ticket **"Research the Are.na public API: channels, blocks, embedding & CORS"** (`binder-b6d4`).
> Verified empirically against the live API (`https://api.are.na/v2`) on **2026-07-11**, cross-checked with the V2 docs (dev.are.na). Every header/field below was observed on a real response unless marked *(docs)*.

## Verdict — the four questions

- **Can a static browser app read Are.na directly?** **Yes.** Public *and* "closed" channels are readable with **no auth**, and the API returns **`Access-Control-Allow-Origin: *`** — so client-side `fetch` from any static origin works with **no proxy**. Green light for the runtime-fetch decision.
- **Block types & embedding?** Six shapes matter — **Image, Text, Link, Media (embed), Attachment, Channel (nested-channel connection)** — each carrying the field Binder needs (external URL, embed HTML, or hosted asset URL). Table below.
- **Nested channels / connections?** First-class. A channel's contents can include Channel blocks, and there are dedicated endpoints to list connected channels — the raw material for the "richer organizing layer."
- **Risks?** V2 is officially **deprecated** (V3 docs are login-gated, unverified), and the API exposes **no rate-limit headers**. Both matter for a runtime-fetch design.

## Base URL & endpoints

Base: `https://api.are.na/v2`. All GET, paginated, **no auth for public/closed channels** *(docs: "Requires authentication: No"; live responses carry `authenticated: false`)*.

| Endpoint | Returns | Notes |
|---|---|---|
| `GET /channels/:slug?page=&per=` | Full channel object **+ one page of `contents`** | Primary read for Binder. Carries `length` (total items), `title`, `metadata.description`, `user`, `status`. |
| `GET /channels/:slug/contents?page=&per=` | `{ contents: [...] }` only | Lighter; **no `length` envelope** — page until a short page. |
| `GET /channels/:slug/connections?page=&per=` | Connected channels (`channels[]` + `channel_title`) | Nested-channel discovery without hydrating blocks. Works with slug. |
| `GET /channels/:id/channels` | Channels connected to blocks in the channel | **Needs the numeric `:id`** — slug returns 404. |
| `GET /channels?page=&per=` | List of published channels | Discovery only; unneeded if the self-hoster names a slug. |
| `GET /blocks/:id` | A single block | |

**Pagination:** `page` (1-based) + `per`. **`per` is capped at 100** (requesting 200 still returns 100). Fetch-all a channel = `ceil(length / 100)` requests to `/channels/:slug?per=100&page=K`; the single-channel envelope reports `length`, the `/contents` endpoint does not.

## Auth & visibility

- Channel `status` ∈ { **public** (read+add by all), **closed** (read by all, add by owner/collaborators), **private** (owner/collaborators only) }. **Both public and closed are browser-readable without auth** — wider than just "public". Only **private** needs a token.
- OAuth (for private) is a code/token flow yielding a **non-expiring bearer token** — unsuitable for a static site (no safe place for the secret). Confirms the public-only decision. Supporting private would mean the self-hoster pastes their own token into their own deploy, accepting the exposure.

## CORS — load-bearing, verified live

Observed on both a normal GET (`Origin: https://example.com`) and an `OPTIONS` preflight:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS, DELETE
Access-Control-Allow-Headers: content-type        (preflight)
Access-Control-Max-Age: 7200
Vary: Origin
```

→ A browser on any origin reads the public API directly, no proxy. *(The API's own responses also carry `X-Frame-Options` — irrelevant here: Binder fetches JSON from the API. The framing constraint that bites Binder is on the **content sites**, see below.)*

## Blocks → what Binder gets (fields observed live)

`class` is the discriminator; `base_class` is `Block` for content, `Channel` for nested channels. `generated_title` is always present (title, else truncated content, else "Untitled") — a ready-made nav label. Filter to `state == "Available"`.

| class | Key fields (observed) | External URL? | Candidate render — *T4 decides* |
|---|---|---|---|
| **Image** | `image.original.url`, `image.display.url` (1200px), `image.thumb.url` (400px) | are.na-hosted | `<img>` (not iframe) |
| **Link** | `source.url` (external), `source.provider.name`, `image.thumb.url` | **yes — the external site** | iframe `source.url` *(subject to that site's `X-Frame-Options`/CSP)* |
| **Media** | `source.url`, **`embed.html`** (embedly `<iframe>`), `embed.type` (`video`/`rich`), `image.*` | via embed | inject `embed.html` — embedly wraps YouTube/Vimeo/Bandcamp, sidestepping their framing rules |
| **Attachment** | `attachment.url`, `attachment.content_type` (e.g. `application/pdf`), `attachment.file_name`, `image.thumb.url` | are.na-hosted file | iframe the file (PDF renders in-frame) or a viewer |
| **Text** | `content` (markdown), `content_html` (rendered) | no | render `content_html` inline |
| **Channel** | `slug`, `title`, `length` (base_class `Channel`) | n/a | a nested nav node → drill into its own contents |

**The framing problem is real and known.** Link blocks point at arbitrary sites, many of which refuse iframing via `X-Frame-Options`/CSP (Binder's README already lists NYT/Twitter/Facebook/GitHub). Media blocks dodge this by shipping an embedly iframe; Links do not. This is exactly what *Decide per-block embedding and the non-iframeable fallback* (`binder-ab29`) must resolve.

## Nested channels & connections (the organizing layer)

- A channel's `contents` can include **Channel blocks** (`base_class: Channel`) — a connected sub-channel with `slug`/`title`/`length`. Observed live.
- `GET /channels/:slug/connections` returns an envelope with a `channels[]` array — the connected channels, cheaply, without hydrating every block.
- Nesting depth is arbitrary (channels connect channels…), so the organizing model (`binder-7ac4`) needs a stance on how deep to spider and how to render nesting (menu tree / sections / graph).

## Rate limits & runtime resilience

- **No `RateLimit-*` / `Retry-After` headers** are exposed (full header dump checked); the V2 docs publish no numeric limit. Treat it as best-effort — it throttles abuse but advertises no budget.
- Because the runtime-fetch decision means Binder hits the API **on every page load**, it should be a courteous, resilient client: one channel fetch per load, no refetch storms, in-session cache, and graceful handling of 404 / private / deleted channel and network failure. This is the substance of the "runtime resilience" fog item.

## Risk — V2 deprecated, V3 login-gated

The V2 docs (dev.are.na) are banner-marked **deprecated**, pointing to a V3 at `are.na/developers`. But the V3 reference pages (`/developers/explore/channel`) sit **behind a login wall** — unreadable unauthenticated, so V3's base URL, public-read behavior, and CORS posture are **unverified**. Meanwhile **V2 works today**: publicly documented, no-auth for public reads, CORS-enabled — everything Binder needs.

**Recommendation:** build on **V2 now**, but isolate all Are.na calls behind a thin adapter module so a future V3 swap stays contained. The V3 evaluation is tracked as its own ticket (created with this resolution).

## What this unblocks

- **Design the channel-to-navigation organizing model** (`binder-7ac4`) — now has the real structural vocabulary: channels, six block classes, nested Channel connections, `/connections` spidering.
- **Decide per-block embedding and the non-iframeable fallback** (`binder-ab29`) — now has the per-class field map and the confirmed framing constraint (Link = risky, Media = embedly-safe).

---
*Sources: live `api.are.na/v2` (probed 2026-07-11); V2 docs `dev.are.na/documentation/{channels,blocks,authentication}`. V3 docs (`are.na/developers`) login-gated, not verified.*
