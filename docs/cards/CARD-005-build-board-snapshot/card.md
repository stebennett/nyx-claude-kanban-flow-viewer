---
id: CARD-005
type: task
layer: domain
reqs: [REQ-003, REQ-004, REQ-019, REQ-033]
title: Build a board snapshot from the board directory
status: split
phase: split
right_sized: ""
depends_on: [CARD-019, CARD-020]
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
estimated_lines: 390
actual_lines: ""
started: 2026-07-18
delivered: ""
created: 2026-07-17
---

## Why
Assembles parsed cards, config and milestones into the single snapshot every consumer
reads. Full snapshots are deliberate: the client can never drift from disk.

## Acceptance criteria
- [ ] A snapshot carries generatedAt, projectName (from the target directory's basename), config, cards, milestones, parseErrors (REQ-019)
- [ ] `config.wipLimit` is read from config.md frontmatter (REQ-003)
- [ ] Milestones parse from MILESTONES.md with name, cardIds, done, total (REQ-004)
- [ ] A malformed card.md lands in parseErrors with path and error while every other card still parses (REQ-033)

## Notes
Split into CARD-021 (Assemble a board snapshot from cards, config and parse errors) and CARD-022 (Add
milestone progress to the board snapshot) — the fixture-heavy single-card estimate breached `size_limit`
(slice.md/slice-check.md, terminal records). CARD-006 rewired onto CARD-022.

AC-4 is the server half of REQ-033 — the malformed card reaches the snapshot as a
parseError. CARD-017 renders it in the unparseable tray. Distinct behaviours either side
of the API boundary, asserted differently (JSON here, DOM there).

REQ-003's "and other tunables" is unbounded in the spec; REQ-019 shows only
`config: { wipLimit: 3 }`. AC-2 covers the enumerable part. Flagged at intake as a thin
REQ, not a thin card — a `/requirement` candidate if more tunables are ever needed.

At 390 est. lines this is ~78% of `size_limit` — on the slicer's watch list alongside
CARD-004 and CARD-009. `right_sized: ""` keeps `SLC-SIZE` live.
