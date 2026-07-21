---
id: CARD-026
type: feature
layer: api
reqs: [REQ-013]
title: CLI --no-open flag and default browser launch
status: backlog
phase: backlog
right_sized: true
depends_on: [CARD-025]
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
estimated_lines: 169
actual_lines: ""
started: ""
delivered: ""
created: 2026-07-21
---

## Why
Opens the board in a browser by default so the happy path needs no manual step, with an
escape hatch for headless and CI use.

## Acceptance criteria
- [ ] By default, once the server is listening, the CLI opens the system default browser at the server's URL (REQ-013)
- [ ] `--no-open` suppresses the browser open; the server still starts and logs its URL (REQ-013)

## Notes
Split out of CARD-018.

**Accepted rough edge, inherited from CARD-018: this opens a browser onto a 404.** This
card ships in M2, but nothing serves `GET /` until CARD-009 in M3 — so for the duration of
M2, the default browser-open lands on a 404. Raised at intake and accepted deliberately:
the alternative was moving CARD-009 into M2, which would put a 420-line UI card in the
foundation milestone and make "headless board API" false. M2's exit criteria claim the API
and the non-zero exit, never a working browser. CARD-009 (M3) makes it real.

Last of CARD-018's four children; chained after CARD-025 because all four extend `args.ts`
and `index.ts` incrementally. It is naturally last regardless — the browser open fires only
once the server is already listening.
