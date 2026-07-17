---
id: CARD-001
type: task
layer: infra
reqs: [REQ-006, REQ-007, REQ-036]
title: Scaffold the TypeScript package and toolchain
status: design
phase: design
right_sized: true
depends_on: []
branch: task/001-scaffold-package-toolchain-design
worktree: .worktrees/CARD-001-design
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
estimated_lines: 360
actual_lines: ""
started: 2026-07-17
delivered: ""
created: 2026-07-17
---

## Why
Nothing can be linted, typechecked, tested, built or released until the package exists.
This card establishes package.json, TypeScript config, ESLint, Vitest and Vite, plus
minimal server and UI entry points, so that every gate REQ-036 requires has something
real to run against. It is the enabling floor for the CI and release pipeline, not the
server or UI themselves — those are built on top of it by later cards.

## Acceptance criteria
- [ ] `npm ci && npm run lint` exits zero on a clean checkout (REQ-036)
- [ ] `npm run typecheck` (`tsc --noEmit`) exits zero (REQ-036)
- [ ] `npm test` runs Vitest and passes with at least one real test (REQ-036)
- [ ] `npm run build` produces the UI bundle inside the package (REQ-006, REQ-007)
- [ ] package.json declares the `kanban-flow-viewer` bin and a `files` list including the built bundle (REQ-006, REQ-007)

## Notes
Scope discipline: hold the REQ-006 footprint to the bare entry points REQ-036's gates
need to execute against. The real server and UI belong to the cards sliced from
REQ-001..REQ-035 — this card must not pre-empt them.

Sizing: `estimated_lines: 406` was derived by `card-intake-checker` from the acceptance
criteria alone, against an empty tree — confidence is low, plausible range 350–480. The
whole margin under `size_limit` 500 comes from `package-lock.json` being in
`size_exclude`. `right_sized` is deliberately left `""` so `card-slicer` re-checks the
size at pickup. A split was considered and rejected at intake: the natural cut
("package + server" / "UI + Vite") yields two cards neither of which can satisfy
`npm run build` alone, so both would be non-shippable.
