---
id: CARD-018
type: feature
layer: api
reqs: [REQ-011, REQ-012, REQ-013, REQ-014]
title: CLI flags and startup validation
status: slice
phase: slice
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
estimated_lines: 305
actual_lines: ""
started: 2026-07-21
delivered: ""
created: 2026-07-17
---

## Why
Makes the CLI usable and honest: pick a port, point at a non-default board, keep the
browser shut, and fail clearly and early when the target isn't a kanban-flow board at all.

## Acceptance criteria
- [ ] `--port` defaults to 4400 and auto-increments when taken (REQ-011)
- [ ] `--board-dir` defaults to `docs/cards` and `--board-dir <path>` parses a board at that path (REQ-012)
- [ ] `--no-open` suppresses the browser, which otherwise opens (REQ-013)
- [ ] A missing board dir, or one with neither `config.md` nor any `CARD-*` dir, exits non-zero with the "no kanban-flow board found — run /kanban-init?" message (REQ-014)

## Notes
Split out of CARD-006 at intake, which projected to 528 lines against a `size_limit` of
500. CARD-006 kept the HTTP server; this card took the flags and validation.
CARD-007/008/009 depend on CARD-006, not on this card.

**Accepted rough edge: AC-3 opens a browser onto a 404.** This card ships in M2, but
nothing serves `GET /` until CARD-009 in M3 — so for the duration of M2, the default
browser-open lands on a 404. This was raised at intake and accepted deliberately: the
alternative was moving CARD-009 into M2, which would put a 420-line UI card in the
foundation milestone and make "headless board API" false. M2's exit criteria claims the
API and the non-zero exit, never a working browser. CARD-009 (M3) makes it real.

AC-2 asserts both halves of REQ-012 — the default *and* that a given path is honoured.
An intake finding noted that testing only the default leaves the path-resolution behaviour
unobserved; this needs a second fixture board at a non-default path.

REQ-001 applies to the validation's directory reads and is not asserted here — see
CARD-006's design note on siting the no-write guard suite-wide.
