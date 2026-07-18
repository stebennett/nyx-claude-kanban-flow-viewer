---
id: CARD-002
type: task
layer: infra
reqs: [REQ-036]
title: Run lint, typecheck, tests and build on every pull request
status: deliver
phase: deliver
right_sized: true
depends_on: [CARD-001]
branch: task/002-ci-pull-request-gates
worktree: .worktrees/CARD-002-impl
design_pr_url: https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/6
pr_urls: [https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/25]
split_slices: 0
adrs: [ADR-0004, ADR-0006]
reworks:
  slice: 0
  design: 0
  implement: 0
  split: 0
  deliver: 1
review_lenses_failed: []
estimated_lines: 68
actual_lines: 191
started: 2026-07-18
delivered: ""
created: 2026-07-17
---

## Why
Gives every pull request an automated verdict on lint, types, tests and the build, so a
regression is caught before review rather than after merge. It also gives kanban-flow's
own delivery gate a real signal to read: `card-deliver-checker` verifies "CI not red"
before shipping a PR, and until this workflow exists that check passes by absence.

## Acceptance criteria
- [ ] A workflow triggers on `pull_request` targeting main (REQ-036)
- [ ] It runs lint, typecheck, test and build as gates (REQ-036)
- [ ] A PR introducing a lint error, a type error, a failing test, or a broken build reports a red check (REQ-036)
- [ ] The workflow installs with `npm ci` against the committed lockfile (REQ-036)

## Notes
Marking a check "required" for merge is repo branch-protection configuration, not
workflow code — out of scope for this card.

`right_sized: true` at intake, so the slice phase is skipped: `estimated_lines: 68` from
`card-intake-checker` (INT-SIZED) is this card's only pre-code size check. One new
workflow file against a `size_limit` of 500 leaves room for a 4x estimation error.

CARD-003 reuses this workflow's gates — see its notes on `workflow_call`.
