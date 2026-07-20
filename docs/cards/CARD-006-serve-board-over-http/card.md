---
id: CARD-006
type: feature
layer: api
reqs: [REQ-001, REQ-006, REQ-010, REQ-016]
title: Serve the parsed board over HTTP
status: design
phase: design
right_sized: ""
depends_on: [CARD-022]
branch: feature/006-serve-board-over-http-design
worktree: .worktrees/CARD-006-serve-board-over-http
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
estimated_lines: 313
actual_lines: ""
started: 2026-07-20
delivered: ""
created: 2026-07-17
---

## Why
The first user-reachable slice — `npx kanban-flow-viewer <repo>` starts a server and
serves the real parsed board over HTTP.

## Acceptance criteria
- [ ] `npx kanban-flow-viewer <path-to-repo>` starts a server on port 4400 and `GET /api/board` returns the snapshot (REQ-010, REQ-016)
- [ ] Running the viewer never writes to the target repository and makes no network call to GitHub (REQ-001)

## Notes
Split out of a larger CARD-006 at intake, which projected to 528 lines against a
`size_limit` of 500. The CLI flags and startup validation went to CARD-018; this card
keeps the HTTP server. CARD-007/008/009 depend on this card, not on CARD-018.

**Design note — REQ-001's guard breadth.** AC-2 is a cross-cutting negative invariant, but
a test living in this card's file can only exercise what exists when this card ships.
CARD-007's watcher (chokidar can be configured to write), CARD-008's doc reads and
CARD-018's validation all touch the target repo, and none has an AC that would catch a
regression. Site the no-write/no-network assertion suite-wide — e.g. a fixture that hashes
the target tree before and after every server-level test — rather than inside this card's
test file. Cheap now, unbuyable later.

**Design note — port binding.** AC-1 names port 4400, but the auto-increment arrives with
CARD-018. Between the two cards landing, an integration test binding a fixed 4400 will
flake on any machine or CI runner with 4400 busy. Bind an ephemeral port (`:0`) in this
card's test and assert the served snapshot; leave the *default* of 4400 to CARD-018 AC-1,
where it is actually claimed.

`reqs` carries REQ-006 by residence (the "CLI entry" and "small Node HTTP server" it
enumerates); no AC cites it, which is correct for a structural REQ.
