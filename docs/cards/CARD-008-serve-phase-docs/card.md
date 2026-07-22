---
id: CARD-008
type: feature
layer: api
reqs: [REQ-005, REQ-018, REQ-035]
title: Serve a card's phase docs
status: implement
phase: test
right_sized: true
depends_on: [CARD-006]
branch: feature/008-serve-phase-docs
worktree: .worktrees/CARD-008-serve-phase-docs
design_pr_url: https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/62
pr_urls: []
split_slices: 0
adrs: [ADR-0013]
reworks:
  slice: 1
  design: 1
  implement: 0
  split: 0
  deliver: 0
review_lenses_failed: []
estimated_lines: 460
actual_lines: ""
started: 2026-07-21
delivered: ""
created: 2026-07-17
---

## Why
Phase docs mostly live on the card's branch during flight, not in the primary checkout.
This reaches them via the frontmatter `worktree` path so the detail panel can show them.

## Acceptance criteria
- [ ] `GET /api/cards/:id/docs` returns the phase docs found in the card dir in the primary checkout — `slice.md`, `design.md`, `implement.md`, `test.md`, `review.md`, `deliver.md` and any `*-check.md` (REQ-005, REQ-018)
- [ ] Docs are also read from the card's `worktree` path when set and existing, and the worktree copy wins on conflict (REQ-005, REQ-018)
- [ ] Every returned doc is labeled with its source (main-checkout vs worktree) (REQ-018)
- [ ] A `worktree` path that is unset or missing falls back to the primary checkout without error; absent docs are simply not returned (REQ-035)

## Notes
AC-1 enumerates the seven patterns deliberately — an intake finding flagged that "phase
docs" left undefined at card level invites an implementer to drop the `*-check.md` glob,
which is the one most easily missed and needs a fixture of its own.

REQ-001 applies to the doc reads here and is not asserted by this card's ACs — see
CARD-006's design note on siting the no-write guard suite-wide.
