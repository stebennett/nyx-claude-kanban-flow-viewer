## Slice 1 of 2

CARD-006 — Serve the parsed board over HTTP. Infrastructure slice: the shared `server-guard` REQ-001
tripwire that every server-level test reuses. Slice 2 (the HTTP server) follows once this merges.

## PR
https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/58

## Commit/changelog
- Branch `feature/006-serve-board-over-http-1` (rebased clean on fresh `origin/main`; design PR #56 already merged).
- `test/server-guard.ts` (+161) + `test/server-guard.test.ts` (+226) — the dependency-free `digestTree`/`assertNoRepoWrites`/`assertNoNonLoopbackNetwork` guard (ADR-0011) + its 17 self-tests.
- Carries the card's implementation-phase docs (implement/test/review/split/split-check/split-acceptance).
- Gates green: lint, `tsc -b --noEmit`, build, `npm test` **122 passed (8 files)** (128 − the 6 http-server tests not present in slice 1).

## Post-merge
On merge, reconcile marks slice 1 shipped and cuts slice 2 (the HTTP server + CLI) off the new `main`
(which then carries the guard), opening it as PR 2/2.
