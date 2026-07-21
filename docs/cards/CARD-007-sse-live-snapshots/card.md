---
id: CARD-007
type: feature
layer: api
reqs: [REQ-006, REQ-008, REQ-017]
title: Push live snapshots over SSE
status: split
phase: split
right_sized: false
depends_on: [CARD-006]
branch: ""
worktree: ""
design_pr_url: ""
pr_urls: []
split_slices: 0
adrs: []
reworks:
  slice: 1
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
Split into CARD-027, CARD-028, CARD-029, CARD-030 (2026-07-21). Terminal — the ACs below live
on the children: AC1 → CARD-027, AC2's re-parse clause → CARD-028 and its push clause →
CARD-029, AC3 → CARD-030. CARD-012 was rewired from this card to CARD-030 (the terminal child),
which transitively requires the other three.

The first slice proposal split this card three ways; the slice-check failed SLC-SIZE on the
combined watch-and-push child (428-463 against the 500 cap — an 8-14% margin on the child
carrying the first non-gray-matter runtime dependency and the first real-filesystem async-event
test in the codebase). The rework carved that child along AC2's own two clauses, and the
re-check passed all seven criteria.

Full snapshots only — no granular or patch events. The debounce plus full re-parse is what
makes partial and multi-file writes self-healing: the next event produces a correct
snapshot regardless of what was observed mid-write.

REQ-001 applies here and is not asserted by this card's ACs — chokidar can be configured
to write. See CARD-006's design note on siting the no-write guard suite-wide.

`reqs` carries REQ-006 by residence: REQ-006 enumerates "chokidar file watcher" as part of
the server half, and that is this card. No AC cites it, which is correct for a structural
REQ.
