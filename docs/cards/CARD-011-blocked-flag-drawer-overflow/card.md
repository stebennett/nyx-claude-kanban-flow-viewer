---
id: CARD-011
type: feature
layer: web
reqs: [REQ-025, REQ-026, REQ-027]
title: Blocked flag, terminal drawer, and overflow column
status: backlog
phase: backlog
right_sized: ""
depends_on: [CARD-009, CARD-010]
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
estimated_lines: 340
actual_lines: ""
started: ""
delivered: ""
created: 2026-07-17
---

## Why
Blocked is a flag, not a column — a blocked card must stay in the column for the phase it
is actually in, rather than vanishing into a Blocked bucket that hides where the work
stalled. Also keeps terminal and unrecognized cards visible rather than silently dropped.

## Acceptance criteria
- [ ] A blocked card renders in its underlying phase's column with a red BLOCKED flag and the blocker reason (REQ-025)
- [ ] The column comes from `phase` when it holds a flow value, else is inferred from which phase docs exist (deliver.md → Deliver … slice.md → Slice), else falls back to Backlog (REQ-025)
- [ ] `split` and `superseded` cards render in a collapsed, de-emphasized drawer below the board (REQ-026)
- [ ] A card with an unrecognized status renders in a labeled overflow column and is never silently dropped (REQ-027)

## Notes
**AC-2 depends on CARD-004 AC-6.** The phase-doc presence it infers from is not
frontmatter — it is a directory scan the parser must record into the card model, and
CARD-005 carries into the snapshot's `cards`. This card reads it from the snapshot; it
must not fetch `/api/cards/:id/docs` per blocked card, which would put a network call
behind every column placement. The chain (011→010→009→006→005→004) makes the data
reachable without an explicit `depends_on` edge to CARD-004.

This card claims REQ-028's trailing blocked-flag clause via REQ-025; CARD-010 abstains
from it, so the flag is claimed exactly once.

`depends_on: [CARD-010]` is a serialization edge, not a data dependency — both cards edit
`src/ui/Card.tsx` and would otherwise become ready together and risk a merge conflict.
