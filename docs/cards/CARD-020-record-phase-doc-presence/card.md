---
id: CARD-020
type: task
layer: domain
reqs: [REQ-025]
title: Record phase-doc presence in the card model
status: done
phase: done
right_sized: true
depends_on: [CARD-019]
branch: task/020-record-phase-doc-presence
worktree: .worktrees/CARD-020-impl
design_pr_url: https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/20
pr_urls: [https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/24]
split_slices: 0
adrs: []
reworks:
  slice: 0
  design: 0
  implement: 0
  split: 0
  deliver: 0
review_lenses_failed: []
estimated_lines: 145
actual_lines: 185
started: 2026-07-18
delivered: 2026-07-18
created: 2026-07-18
---

## Why
REQ-025 infers a blocked card's column from which phase docs exist on disk. The card model must
expose that scan so a later renderer (CARD-011) can place a blocked card in its underlying phase's
column without reading the docs' contents. This is a small, purely-additive field on the model
CARD-019 produces.

## Acceptance criteria
- [ ] The card model records which phase docs exist in the card dir (slice/design/implement/test/review/deliver and their `*-check` docs), so a blocked card's column can be inferred without reading their contents (REQ-025)
- [ ] The phase-doc scan rides the directory read the parser already performs to locate card.md — no second per-card `readdir`

## Notes
Split out of CARD-004 (Parse a card.md into the card model). This child carries only the phase-doc
presence scan (AC-6 of the parent, REQ-025); the core frontmatter+body parse is the sibling
CARD-019, which this depends on.

Purely additive to `parseCard()`'s return — it adds a `phaseDocsPresent` field, no signature
redesign. The canonical phase-doc filename set (slice.md, design.md, implement.md, test.md,
review.md, deliver.md, and the `*-check.md` docs) is defined once in the parser; CARD-011
(blocked-flag rendering) and CARD-018 (serving phase docs) should reuse it rather than re-deriving.
