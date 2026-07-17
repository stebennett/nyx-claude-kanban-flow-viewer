---
id: CARD-015
type: feature
layer: web
reqs: [REQ-031]
title: Milestones strip
status: backlog
phase: backlog
right_sized: ""
depends_on: [CARD-009]
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
estimated_lines: 145
actual_lines: ""
started: ""
delivered: ""
created: 2026-07-17
---

## Why
Shows delivery progress per milestone alongside the flow view — the flow columns say what
is moving, the strip says how close each increment is to shipping.

## Acceptance criteria
- [ ] A toggleable strip below the board lists each milestone from MILESTONES.md (REQ-031)
- [ ] Each milestone shows a completion bar (done/total cards) and its card IDs (REQ-031)

## Notes
Consumes CARD-005 AC-3's parsed milestones, including their done/total counts — this card
renders, it does not recount.

Smallest card in the set at 145 est. lines.
