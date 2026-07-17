---
id: CARD-010
type: feature
layer: web
reqs: [REQ-022, REQ-028]
title: Card anatomy
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
estimated_lines: 510
actual_lines: ""
started: ""
delivered: ""
created: 2026-07-17
---

## Why
Turns a bare card into a readable one — the badges, chips, progress and PR links a driver
scans the board for.

## Acceptance criteria
- [ ] A card shows its ID badge, title, and type + layer badges (REQ-028)
- [ ] `depends_on` renders as chips, grayed once that dependency is done (REQ-028)
- [ ] The acceptance-criteria progress bar renders with its "3/5" text (REQ-028)
- [ ] PR chips link the design PR and implementation PRs; a split card in deliver with k of N pr_urls shows "slice k/N" (REQ-028, REQ-022)
- [ ] Rework badges render only when non-zero, as "↻2 implement" (REQ-028)

## Notes
This card deliberately does **not** claim REQ-028's trailing blocked-flag clause — that
restates REQ-025 and belongs to CARD-011, so the flag is claimed exactly once across the
board.

**Split seam, recorded at intake.** Estimated at 510 against a `size_limit` of 500 — a
straddle, not a confident breach: the overage is dominated by an unmade styling decision
(plain CSS ~85 lines vs a utility framework ~0, with ~15% more JSX), which swings this card
by ±70 on its own. Left to `SLC-SIZE`, which re-checks at pickup against a real tree once
CARD-009 has shipped. If a split is needed, the seam is **REQ-022 + the link-bearing PR
chips (AC-4 — the only logic-bearing part)** vs **REQ-028's static anatomy (AC-1, AC-2,
AC-3, AC-5)**.

CARD-011 depends on this card purely to serialize edits to `src/ui/Card.tsx` — without
that edge both become ready the instant CARD-009 lands and `/kanban` could run them
concurrently into a merge conflict.
