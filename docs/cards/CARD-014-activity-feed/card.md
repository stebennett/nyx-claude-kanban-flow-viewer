---
id: CARD-014
type: feature
layer: web
reqs: [REQ-030]
title: Activity feed
status: backlog
phase: backlog
right_sized: ""
depends_on: [CARD-013]
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
estimated_lines: 260
actual_lines: ""
started: ""
delivered: ""
created: 2026-07-17
---

## Why
Gives the session a narrative — what moved and when — without any historical storage. A
driver who looks away for ten minutes can see what happened while they were gone.

## Acceptance criteria
- [ ] A collapsible right rail lists session-observed events with timestamps (REQ-030)
- [ ] A column move logs as "14:02 CARD-012 implement → test" and a criteria change as "14:05 CARD-009 criteria 2/5 → 3/5" (REQ-030)
- [ ] The feed starts empty each session and is not persisted (REQ-030)

## Notes
Consumes CARD-013's snapshot diff — the same diff that drives the animations. Do not build
a second diff.

AC-3 is deliberate scope: historical analytics (cycle time, cumulative flow) are out of
scope for v1, and the feed being session-only is why. It observes only what happens while
the page is open; it does not reconstruct history from the board.
