# Issue tracker — seeds

This repo tracks issues with **seeds** (`sd`, v0.5.x) — a git-native tracker whose
store lives in `.seeds/` (issues are one-JSON-per-line in `.seeds/issues.jsonl`,
merged across branches by a `merge=union` git driver in `.gitattributes`). Run
`sd prime` for seeds' own agent reference; `sd doctor` to health-check the store.

Issue ids look like `binder-a1b2` — the `binder-` prefix is the `project` key in
`.seeds/config.yaml`, the suffix is a random 4-hex hash. Ids are **not sequential**;
always capture the id returned by `sd create --json`.

**Refer to issues by title, never by bare id.** `sd list`, `sd ready`, and
`sd blocked` all print titles — read at a glance, wrap the id inside the name.

Wayfinder answers live **here, in seeds descriptions** — not in mulch. Mulch is this
machine's expertise store and plays no part in the wayfinder loop.

## Wayfinding operations

How this repo expresses the [wayfinder](../../.claude) map on seeds. Each subsection
is the tracker-specific recipe the wayfinder skill defers to.

### The map

One `epic` issue, label `wayfinder:map`. Its **description** holds the whole map
body (`## Notes` / `## Decisions so far` / `## Fog`) — seeds has no comment
mechanism, so every artifact lives in a description.

```sh
# find the map
sd list --all --label wayfinder:map --format ids

# create it (multi-line body via bash ANSI-C $'...' quoting)
sd create --type epic --title "<map name>" --labels wayfinder:map \
  --description $'## Notes\n<domain, skills, standing prefs>\n\n## Decisions so far\n\n## Fog\n- <dim view>'

# read / rewrite the body — there is no append; you replace the whole description
sd show <mapid> --json | jq -r '.issue.description'
sd update <mapid> --description "$NEW_BODY"
```

### Tickets

A ticket is an issue bound to its map by the label `wf-map:<mapid>` — seeds has no
native parent/child, so the label *is* the edge. It also carries `wayfinder:ticket`
and exactly one type label: `wayfinder:research`, `wayfinder:prototype`,
`wayfinder:grilling`, or `wayfinder:task`. Its `## Question` lives in the description.

```sh
sd create --title "<ticket name>" \
  --labels "wayfinder:ticket,wayfinder:grilling,wf-map:<mapid>" \
  --description $'## Question\n<the decision or investigation this resolves>'
```

Order the frontier with `--priority 0..4` (0 = take first; `sd ready` sorts by
priority by default).

### Blocking

Native. "A blocks C" ⇔ "C depends on A":

```sh
sd block <C> --by <A>        # equivalently: sd dep add <C> <A>
sd blocked                   # every currently-blocked issue
sd show <C> --json | jq '.issue.blockedBy'
```

The edge is stored on the blocker; C is **unblocked automatically** the moment every
ticket blocking it is closed. This is the frontier's engine — do not hand-maintain it.

### The frontier (takeable work)

Open + unblocked + unclaimed tickets of one map:

```sh
sd ready --label "wayfinder:ticket,wf-map:<mapid>"
```

`sd ready` returns only `open` + unblocked issues, so **claimed** (`in_progress`) and
**resolved** (`closed`) tickets drop out on their own, and the `--label` AND-filter
scopes to this map while excluding the map epic (it lacks `wayfinder:ticket`). For a
hard guard against a stray open-but-assigned ticket, also drop assigned ones:

```sh
sd ready --label "wayfinder:ticket,wf-map:<mapid>" --json \
  | jq -r '.issues[] | select(has("assignee")|not) | "\(.id)\t\(.title)"'
```

### Claim

Assign the driving dev **and** flip status to `in_progress`, before any work, so
concurrent sessions skip it. The status flip is what keeps the ticket out of the
frontier (see above) — assignee alone does not.

```sh
sd update <ticket> --assignee "<dev>" --status in_progress
```

Seeds has no identity config — pass the dev name explicitly (default to
`git config user.name`). It also **cannot clear an assignee** (`--assignee ""` is a
silent no-op); to **release** an abandoned claim, flip status back:
`sd update <ticket> --status open` — the lingering assignee is cosmetic and the next
claimant overwrites it.

### Resolve

No comments, so record the answer in the description, then close, then update the map.
Seeds does **not** enforce this order — it will let you close a blocked or unanswered
ticket — so the discipline is yours.

```sh
BODY=$(sd show <ticket> --json | jq -r '.issue.description // ""')
sd update <ticket> --description "$BODY"$'\n\n## Answer\n<the resolution>'
sd close <ticket> --reason "<one-line gist>"
```

Then append the one-line pointer to the map's `## Decisions so far` (whole-description
rewrite, per **The map**). Link assets (files, prototypes) by path inside `## Answer`;
don't paste them in.

If the resolved ticket was **blocking** others, its `blocks` edges persist on the
now-closed issue, and `sd doctor` warns (`bidirectional-consistency`) because the
dependents' derived `blockedBy` is already empty. The frontier is still correct — but
clear each satisfied edge to keep the store green: `sd dep remove <dependent> <this-ticket>`.

### Concurrency

`merge=union` makes parallel sessions **creating distinct tickets** safe. Two sessions
**editing the same issue** are not: union keeps both JSONL lines and a read returns the
physically-last one — *not* the newest by timestamp — so an edit can be silently lost.
Serialize edits to any shared issue, above all the **map body**, and re-read
(`sd show`) immediately before each write. `sd doctor` flags duplicate ids (a warning).
