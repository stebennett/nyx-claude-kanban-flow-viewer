---
id: CARD-009
type: feature
layer: web
reqs: [REQ-006, REQ-015, REQ-024]
title: Serve the SPA and render eight flow columns
status: backlog
phase: backlog
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
estimated_lines: 420
actual_lines: ""
started: ""
delivered: ""
created: 2026-07-17
---

## Why
The board becomes visible — the built app is served and renders cards into their flow
columns from a snapshot. Also makes CARD-018's default browser-open land on something real
rather than a 404.

## Acceptance criteria
- [ ] `GET /` serves the built React app (REQ-015)
- [ ] The board renders eight columns: Backlog, Slice, Design, Implement, Test, Review, Deliver, Done (REQ-024)
- [ ] A card renders in the column matching its `status` (REQ-024)

## Notes
AC-3 covers the straightforward `status` → column mapping. The harder cases — a blocked
card belonging in its underlying phase's column, terminal cards, unrecognized statuses —
are CARD-011's.

AC-1 (serve the built bundle) is distinct from CARD-001 AC-4 (`npm run build` produces the
bundle): build vs serve, no overlap.

`reqs` carries REQ-006 by residence — REQ-006 names the UI half as a "React + Vite
single-page app" and the server half as "serving the pre-built UI bundle", which is this
card. No AC cites it, which is correct for a structural REQ.

At 420 est. lines this is ~84% of `size_limit`, with CSS as the main swing — on the
slicer's watch list. `right_sized: ""` keeps `SLC-SIZE` live.
