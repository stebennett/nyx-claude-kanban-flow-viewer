---
id: CARD-025
type: feature
layer: api
reqs: [REQ-011]
title: CLI --port flag with default and auto-increment
status: backlog
phase: backlog
right_sized: true
depends_on: [CARD-024]
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
estimated_lines: 220
actual_lines: ""
started: ""
delivered: ""
created: 2026-07-21
---

## Why
Lets the operator pick a port, and keeps the CLI usable when the default 4400 is already
taken instead of crashing.

## Acceptance criteria
- [ ] `--port` defaults to 4400 (REQ-011)
- [ ] `--port <n>` binds the given port instead of the default (REQ-011)
- [ ] When the selected port is already in use, the server auto-increments to the next free port instead of erroring out (REQ-011)

## Notes
Split out of CARD-018.

This card claims the **default port 4400 and its auto-increment**, which CARD-006
deliberately left unclaimed: CARD-006's design note records that its own tests bind an
ephemeral port (`:0`) precisely because the auto-increment arrives here, and a test binding
a fixed 4400 would flake on any machine where 4400 is busy.

Chained after CARD-024 rather than run in parallel: all four CARD-018 children extend
`args.ts` and `index.ts` incrementally, and the chain avoids parallel branches conflicting
on those files.

The slice-check re-estimated this child at ~315–335 rather than the slicer's 220 — the
real-socket retry test was sized light against this repo's own ratio for real-server tests
(`http-server.test.ts` runs 4.8x its source). Still well under the 500 cap, but budget the
test file generously.
