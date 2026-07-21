---
id: CARD-027
type: feature
layer: api
reqs: [REQ-017]
title: SSE endpoint sends the current snapshot on connect
status: implement
phase: implement
right_sized: true
depends_on: [CARD-006]
branch: feature/027-sse-snapshot-on-connect
worktree: .worktrees/CARD-027-sse-snapshot-on-connect
design_pr_url: https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/63
pr_urls: []
split_slices: 0
adrs: [ADR-0014]
reworks:
  slice: 0
  design: 1
  implement: 0
  split: 0
  deliver: 0
review_lenses_failed: []
estimated_lines: 195
actual_lines: ""
started: 2026-07-21
delivered: ""
created: 2026-07-21
---

## Why
A client can open a live connection and immediately see the current board, priming the live
view before any change ever occurs.

## Acceptance criteria
- [ ] `GET /api/events` emits the full snapshot once on connect (REQ-017)
- [ ] The connection stays open (no immediate close) and a second, independent connection also
      receives its own current snapshot

## Notes
Split out of CARD-007.

Extends `http-server.ts`'s dispatch with `GET /api/events`: SSE headers, one
`data: <json>\n\n` frame from the existing injectable `snapshot()`, and a
subscribe/unsubscribe hub for connection lifecycle.

Scope note (not an acceptance criterion): the hub built here also exposes a `publish` method
with **no caller and no assertion in this card's own tests** — it is the seam CARD-029 uses to
broadcast. A design or review check should not treat `publish` as in-scope for this card's own
coverage.

REQ-001 is not asserted here (no chokidar yet) — see CARD-006's ADR-0011 on siting the
no-write guard suite-wide.
