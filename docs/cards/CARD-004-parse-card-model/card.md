---
id: CARD-004
type: task
layer: domain
reqs: [REQ-002, REQ-006, REQ-020, REQ-021, REQ-025]
title: Parse a card.md into the card model
status: backlog
phase: backlog
right_sized: ""
depends_on: [CARD-001]
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
estimated_lines: 393
actual_lines: ""
started: ""
delivered: ""
created: 2026-07-17
---

## Why
The parser is the viewer's foundation — every other card reads its output. Card
frontmatter is the source of truth (REQ-002), so this is where that authority is
implemented: BOARD.md is a rendered view and is never read.

## Acceptance criteria
- [ ] Frontmatter is parsed with gray-matter into the card model's fields (REQ-020, REQ-021)
- [ ] `criteria: {done, total}` counts `- [ ]` / `- [x]` items under the `## Acceptance criteria` heading only, ignoring checkboxes elsewhere in the body (REQ-020)
- [ ] The Why paragraph and Notes are extracted from the body (REQ-020)
- [ ] A card model is produced without reading BOARD.md (REQ-002)
- [ ] Missing optional frontmatter fields do not fail the parse (REQ-020)
- [ ] The card model records which phase docs exist in the card dir (slice/design/implement/test/review/deliver/*-check), so a blocked card's column can be inferred without reading their contents (REQ-025)

## Notes
**AC-6 exists because of an intake finding.** REQ-025 lets a blocked card's column be
inferred from which phase docs exist on disk, but that fact is a directory scan, not
frontmatter — so it does not ride in on gray-matter for free. Without AC-6 the consuming
card (CARD-011, `layer: web`, two milestones later) would reach implement and find its
criterion unbuildable. This card records the fact; CARD-011 chooses the column and renders
the flag.

**Spec divergence to reconcile.** REQ-020's field list does not enumerate the phase-doc
presence field this card now produces. `/refine` may not author requirement prose, so the
spec and the parser have deliberately diverged — a future `/requirement` run should
reconcile REQ-020 with what the parser actually emits. Same for `branch`, `worktree` and
`adrs`, which REQ-032 renders and gray-matter supplies for free.

**Design note:** AC-6's readdir is per-card and REQ-008 re-parses everything on every
debounced change. Ride the directory read the parser already does rather than adding a
second `readdir` per card.

`reqs` carries REQ-006 by residence, not behaviour: REQ-006 enumerates the server half as
"CLI entry, chokidar file watcher, card parser, small Node HTTP server" — "card parser" is
this card. No AC cites REQ-006; that is correct for a structural REQ (see the intake check
report's note on reqs-as-index).

At 393 est. lines this is ~79% of `size_limit`; `right_sized: ""` keeps `SLC-SIZE` live.
