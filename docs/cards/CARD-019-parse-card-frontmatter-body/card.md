---
id: CARD-019
type: task
layer: domain
reqs: [REQ-002, REQ-006, REQ-020, REQ-021]
title: Parse card.md frontmatter and body into the card model
status: review
phase: review
right_sized: true
depends_on: [CARD-001]
branch: task/019-parse-card-frontmatter-body
worktree: .worktrees/CARD-019-impl
design_pr_url: https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/7
pr_urls: []
split_slices: 0
adrs: [ADR-0005]
reworks:
  slice: 0
  design: 0
  implement: 0
  split: 0
  deliver: 0
review_lenses_failed: []
estimated_lines: 300
actual_lines: ""
started: 2026-07-18
delivered: ""
created: 2026-07-18
---

## Why
The board API needs one authoritative card model built straight from `card.md`'s frontmatter and
body, not from `BOARD.md`. This card is the core parser: gray-matter maps a card's YAML frontmatter
into the card model, and the body text yields the Why paragraph, Notes, and the acceptance-criteria
done/total counts. It is the domain-layer foundation CARD-005 (board snapshot) assembles over.

## Acceptance criteria
- [ ] Frontmatter is parsed with gray-matter into the card model's fields (REQ-020, REQ-021)
- [ ] `criteria: {done, total}` counts `- [ ]` / `- [x]` items under the `## Acceptance criteria` heading only, ignoring checkboxes elsewhere in the body (REQ-020)
- [ ] The Why paragraph and Notes are extracted from the body (REQ-020)
- [ ] A card model is produced without reading BOARD.md (REQ-002)
- [ ] Missing optional frontmatter fields do not fail the parse (REQ-020)

## Notes
Split out of CARD-004 (Parse a card.md into the card model). This child carries the core
frontmatter+body mapping (AC-1..5 of the parent, REQ-002/020/021); the phase-doc presence scan
(REQ-025) is the sibling CARD-020.

Introduces the project's first runtime dependency, `gray-matter`, added to `dependencies` (per
CARD-001's KNOWLEDGE note that `dependencies` stays empty until a card genuinely needs one).

Convention (from the slice phase): `card.md` frontmatter keys are snake_case (`depends_on`,
`design_pr_url`, `pr_urls`, `split_slices`, `estimated_lines`, `actual_lines`); the card model's
fields are camelCase — this parser is the single mapping point between the two.
