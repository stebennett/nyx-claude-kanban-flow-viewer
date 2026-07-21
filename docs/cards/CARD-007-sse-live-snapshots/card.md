---
id: CARD-007
type: feature
layer: api
reqs: [REQ-006, REQ-008, REQ-017]
title: Push live snapshots over SSE
status: slice
phase: slice
right_sized: ""
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
estimated_lines: 307
actual_lines: ""
started: 2026-07-21
delivered: ""
created: 2026-07-17
---

## Why
Makes the board live — a change on disk reaches connected clients without a reload.

## Acceptance criteria
- [ ] `GET /api/events` emits the full snapshot once on connect (REQ-017)
- [ ] Changing a card file under board_dir causes a full re-parse and emits a new full snapshot (REQ-008, REQ-017)
- [ ] Changes are debounced ~200 ms, so a multi-file write emits one correct snapshot rather than a burst (REQ-008)

## Notes
Full snapshots only — no granular or patch events. The debounce plus full re-parse is what
makes partial and multi-file writes self-healing: the next event produces a correct
snapshot regardless of what was observed mid-write.

REQ-001 applies here and is not asserted by this card's ACs — chokidar can be configured
to write. See CARD-006's design note on siting the no-write guard suite-wide.

`reqs` carries REQ-006 by residence: REQ-006 enumerates "chokidar file watcher" as part of
the server half, and that is this card. No AC cites it, which is correct for a structural
REQ.
