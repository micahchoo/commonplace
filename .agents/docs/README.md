# Agent-facing docs

Documentation written for AI agents and automated maintenance runs — not part of the
human-facing product docs (those live in [`../../docs/`](../../docs/)) or the contributor guide
([`../../CONTRIBUTING.md`](../../CONTRIBUTING.md)).

The repo's active agent instructions stay at the root ([`../../CLAUDE.md`](../../CLAUDE.md)),
which Claude Code auto-loads; this folder holds the reference material it points to.

| File | What it is |
|---|---|
| [`ISSUES.md`](ISSUES.md) | Health-&-surplus audit (the "tend" run): findings `I1`–`I9` with evidence, leverage, and runnable loops. |
| [`issue-tracker.md`](issue-tracker.md) | Conventions for the seeds/wayfinder issue tracker used to plan and track this work. |
| [`plans/`](plans/) | The original phased implementation plan the build was executed from. |

These are historical/process records. When they name a file, function, or flag, verify it still
exists in the current code before acting on it.
