---
id: CARD-028
type: feature
layer: api
reqs: [REQ-006, REQ-008]
title: Watch the board directory for changes and produce a fresh snapshot
status: backlog
phase: ""
right_sized: true
depends_on: [CARD-006]
branch: ""
worktree: ""
design_pr_url: ""
pr_urls: []
split_slices: 0
adrs: []
reworks:
  slice: 0
  design: 0
  implement: 0
  split: 0
  deliver: 0
review_lenses_failed: []
estimated_lines: 248
actual_lines: ""
started: ""
delivered: ""
created: 2026-07-21
---

## Why
The moment a card file changes on disk, a correct, freshly re-parsed snapshot of the whole
board is produced — the foundation live updates are built on, directly observable by calling
the watcher and inspecting what it reports, independent of any transport.

## Acceptance criteria
- [ ] Changing a card file under `board_dir` causes `watchBoard`'s `onSnapshot` callback to fire
      with a freshly re-parsed, correct full snapshot (REQ-006, REQ-008 re-parse clause)
- [ ] `close()` stops further watch events (no leaked fs watcher)

## Notes
Split out of CARD-007.

Adds `chokidar` (this project's first non-gray-matter runtime dependency) and a new
`src/server/watcher.ts` wrapping it: `watchBoard(options)` → `buildSnapshot` →
`onSnapshot(snapshot)`; `close()`. **No HTTP/SSE involvement at all** — tested entirely by
direct invocation against a real temp fixture board.

This is a module card with no transport consumer, on the accepted CARD-021 precedent:
`buildSnapshot()` shipped as its own card with zero HTTP wiring and was wired into
`GET /api/board` by a later, separate card (CARD-006). CARD-029 is this card's CARD-006. The
slice-check verified that precedent against CARD-021's own card.md rather than taking the
citation on trust.

REQ-001 applies (chokidar can be configured to write) and must be asserted here by wrapping the
fs-touching exercises in `test/server-guard.ts`'s `assertNoRepoWrites` /
`assertNoNonLoopbackNetwork`, per CARD-006's ADR-0011.

Note for design/implement: `writeFixtureBoard`/`withServer` are **not exported** from
`http-server.test.ts` or `build-snapshot.test.ts` — reusing the fixture *pattern* means
re-implementing it in `watcher.test.ts`, not importing it. The line estimate accounts for that.
Non-test source files must be added to `tsconfig.test.json`'s `include` explicitly
(KNOWLEDGE `[CARD-019]`).
