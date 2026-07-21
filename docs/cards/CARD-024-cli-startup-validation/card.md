---
id: CARD-024
type: feature
layer: api
reqs: [REQ-014]
title: CLI startup validation for a missing or non-board directory
status: backlog
phase: backlog
right_sized: true
depends_on: [CARD-023]
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
estimated_lines: 125
actual_lines: ""
started: ""
delivered: ""
created: 2026-07-21
---

## Why
Fails clearly and early when the target repo isn't a kanban-flow board at all, instead of
serving an empty or broken snapshot.

## Acceptance criteria
- [ ] A missing `<repo>/<board-dir>` exits non-zero with "no kanban-flow board found — run /kanban-init?" (REQ-014)
- [ ] A board dir that exists but contains neither `config.md` nor any `CARD-*` directory exits with the same message and non-zero code (REQ-014)
- [ ] A board dir containing `config.md` and/or a `CARD-*` directory passes validation and the server starts normally (happy path, REQ-014)

## Notes
Split out of CARD-018.

Depends on CARD-023 rather than CARD-006 directly: validation needs to know *which* board
dir to check, which is CARD-023's `--board-dir` resolution. It reaches CARD-006
transitively through that chain.

REQ-001 applies to the validation's directory reads and is not asserted here — see
CARD-006's design note on siting the no-write guard suite-wide.

The slice-check noted this child's test file was estimated light against this repo's
real-I/O test ratios (each case needs its own tmp-dir fixture; no shared helper exists
yet). Re-estimated generously it is ~195 lines — still far under the 500 cap.
