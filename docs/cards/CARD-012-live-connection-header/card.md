---
id: CARD-012
type: feature
layer: web
reqs: [REQ-023, REQ-034]
title: Live connection and header
status: backlog
phase: backlog
right_sized: ""
depends_on: [CARD-009, CARD-030]
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
estimated_lines: 325
actual_lines: ""
started: ""
delivered: ""
created: 2026-07-17
---

## Why
Connects the UI to the SSE stream and tells the driver at a glance whether what they are
looking at is live — a stale board that looks live is worse than no board.

## Acceptance criteria
- [ ] The header shows the project name and a WIP indicator ("WIP 2/3"), amber at the limit, counting cards in slice/design/implement/test/review/deliver or blocked against wip_limit (REQ-023)
- [ ] The board re-renders from each snapshot received on the SSE stream (REQ-034)
- [ ] The connection dot shows live vs reconnecting, and EventSource auto-reconnect re-syncs on the next snapshot (REQ-034)

## Notes
AC-2 replaces CARD-009's one-shot `fetch('/api/board')` with the live stream — CARD-009's
static render remains the fallback path and its component tests stay valid.

The connection dot is required by both REQ-023 (header anatomy) and REQ-034 (disconnect
behaviour); it is claimed once, here, on AC-3.

"In flight" for the WIP count means status in slice/design/implement/test/review/deliver,
**or blocked** — a blocked card still holds a WIP slot.
