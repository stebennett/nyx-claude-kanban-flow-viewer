---
id: CARD-017
type: feature
layer: web
reqs: [REQ-033]
title: Unparseable tray
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
estimated_lines: 122
actual_lines: ""
started: ""
delivered: ""
created: 2026-07-17
---

## Why
A bad card file should be visible and fixable, not an invisible gap in the board. Without
the tray, a malformed card.md simply looks like a card that does not exist.

## Acceptance criteria
- [ ] Cards in the snapshot's parseErrors render in an "unparseable" tray showing filename and error (REQ-033)
- [ ] The board renders normally around one bad file (REQ-033)

## Notes
The client half of REQ-033; CARD-005 AC-4 is the server half that puts the entry in the
snapshot's `parseErrors`. Distinct behaviours either side of the API boundary — this one
is asserted against the DOM, CARD-005's against the JSON.
