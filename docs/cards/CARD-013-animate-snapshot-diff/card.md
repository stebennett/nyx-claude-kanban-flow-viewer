---
id: CARD-013
type: feature
layer: web
reqs: [REQ-009, REQ-029]
title: Animate moves by diffing snapshots
status: backlog
phase: backlog
right_sized: ""
depends_on: [CARD-012]
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
estimated_lines: 305
actual_lines: ""
started: ""
delivered: ""
created: 2026-07-17
---

## Why
Makes movement legible — a card crossing columns should be seen moving, not just appear
somewhere new. The diff this card builds is also what feeds the activity feed (CARD-014).

## Acceptance criteria
- [ ] Each snapshot is diffed against the previous one (REQ-009, REQ-029)
- [ ] A card whose column changed animates across with a FLIP transition and a brief highlight (REQ-029)
- [ ] A card with field-only changes highlights in place without moving (REQ-029)

## Notes
The diff is client-side and derives entirely from consecutive full snapshots — the server
never sends granular or patch events. AC-1 names a mechanism rather than a watched
behaviour, which is deliberate: the spec's Testing section explicitly calls for
unit-testing the snapshot-diff logic (move detection, activity entries), and AC-2/AC-3 are
its observable consequences.

CARD-014 consumes this diff. Keep the diff output a data structure the feed can read, not
an animation side effect.
