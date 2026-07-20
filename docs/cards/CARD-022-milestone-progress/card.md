---
id: CARD-022
type: task
layer: domain
reqs: [REQ-004, REQ-019]
title: Add milestone progress to the board snapshot
status: implement
phase: implement
right_sized: true
depends_on: [CARD-021, CARD-019, CARD-020]
branch: task/022-milestone-progress
worktree: .worktrees/CARD-022-milestone-progress-impl
design_pr_url: https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/52
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
estimated_lines: 280
actual_lines: ""
started: 2026-07-20
delivered: ""
created: 2026-07-18
---

## Why
Completes REQ-019's snapshot shape and gives the board its per-milestone completion view. Parses
`MILESTONES.md` and derives each milestone's done/total from the already-parsed cards, wiring a
`milestones` array into the snapshot CARD-021 assembles.

## Acceptance criteria
- [ ] Milestones parse from `MILESTONES.md` into `name`, `cardIds`, `done`, `total` (REQ-004)
- [ ] The snapshot's `milestones` array is correctly derived from the already-parsed `cards`' `status` when a milestone references cards in mixed completion states (REQ-019)

## Notes
Split out of CARD-005 (Build a board snapshot from the board directory). This child carries the
milestones parse (AC-3 of the parent, REQ-004) and wires the `milestones` field into the snapshot;
the core walk (cards/config/parseErrors) is the sibling CARD-021, which this depends on.

`done`/`total` are computed against the snapshot's own parsed `cards`, so a milestone referencing an
unparsed or missing card must not crash. Reuses the canonical `PHASE_NAMES`/card-model types from
CARD-019/020 where relevant. CARD-006 depends on this card (the last child), transitively covering
CARD-021.
