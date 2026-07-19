---
id: CARD-021
type: task
layer: domain
reqs: [REQ-003, REQ-019, REQ-033]
title: Assemble a board snapshot from cards, config and parse errors
status: implement
phase: implement
right_sized: true
depends_on: [CARD-019, CARD-020]
branch: task/021-assemble-board-snapshot
worktree: .worktrees/CARD-021-assemble-board-snapshot
design_pr_url: https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/29
pr_urls: []
split_slices: 0
adrs: [ADR-0008]
reworks:
  slice: 0
  design: 0
  implement: 1
  split: 0
  deliver: 0
review_lenses_failed: [design, functionality, security, tests]
estimated_lines: 340
actual_lines: ""
started: 2026-07-18
delivered: ""
created: 2026-07-18
---

## Why
The board API's foundational read: every consumer needs a crash-proof snapshot of cards, config and
parse failures before milestones exist. This is the core board walk — it reads each `card.md` via the
CARD-019/020 parser, reads `config.md`, and assembles the snapshot every consumer (`GET /api/board`,
the SSE stream, the UI) reads. Milestones are the sibling CARD-022.

## Acceptance criteria
- [ ] A snapshot carries `generatedAt` (ISO timestamp), `projectName` (the target directory's basename), `config`, `cards`, `parseErrors` (REQ-019; the `milestones` field is added by CARD-022)
- [ ] `config.wipLimit` is read from `config.md` frontmatter (REQ-003)
- [ ] A malformed `card.md` lands in `parseErrors` with path and error while every other card still parses (REQ-033)

## Notes
Split out of CARD-005 (Build a board snapshot from the board directory). This child carries the core
walk (AC-1 minus milestones, AC-2, AC-4 of the parent). Milestones (AC-3, REQ-004) are the sibling
CARD-022, which depends on this.

Does the single per-card-dir `readdir` and passes `entries` to `parseCard` (the CARD-020 contract);
wraps each `parseCard` in try/catch (KNOWLEDGE `[CARD-019]`: `parseCard` is not total — `matter()`
throws on malformed YAML) and routes failures to `parseErrors` — this REQ-033 safety property stays
fused to the walk, not split further (a walk without it would be observably unsafe, not a smaller slice).
