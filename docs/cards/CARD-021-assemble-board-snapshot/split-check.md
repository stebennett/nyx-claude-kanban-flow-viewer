---
verdict: pass
criteria: {SPL-NO-LOSS: pass, SPL-GREEN: pass, SPL-SIZE: pass, SPL-ORDER: pass, SPL-FILES: pass, SPL-COHERENT: pass}
---

# CARD-021 — Split check (re-check after SPL-GREEN rework)

## Verdict
pass — all six criteria hold. Second split-check pass on the same carve (2 slices, boundaries/order/sizes
unchanged; the rework `67f8db8` touched only split.md, adding pasted command+output for all 4 gates across
3 materializations, and deleted the stale split-check.md). The prior SPL-GREEN finding is resolved.

## Criteria
| id | verdict | evidence |
|---|---|---|
| SPL-NO-LOSS | pass | Re-derived `git diff --no-renames --name-status origin/main...task/021-assemble-board-snapshot` = 8 paths (4 code + 4 docs/cards, excluded). Code set = {(build-snapshot.test.ts,A),(build-snapshot.ts,A),(card-model.ts,M),(tsconfig.test.json,M)}. Union of slice1 {(card-model.ts,M)} ∪ slice2 {(build-snapshot.ts,A),(build-snapshot.test.ts,A),(tsconfig.test.json,M)} = identical. original\union = {} · union\original = {}. |
| SPL-GREEN | pass | Re-derived independently: Environment bootstraps a throwaway worktree off origin/main @ ac75cd2 (verified ancestor of 0495f58, touching none of the 4 paths — not stale) + npm ci (320 pkgs, matches package-lock). All 4 gates pasted with real command+output for (a) full branch, (b) slice 1 alone, (c) slice 1+2. Cross-checked vitest output against the real repo: 5 test files, per-file counts 5/6/36/21/7 = 75 (full/slice2), 54 (slice1, correctly omitting build-snapshot.test.ts). Exact correspondence = genuine output, not paraphrase. |
| SPL-SIZE | pass | Re-derived --numstat: slice 1 = 17; slice 2 = 85 + 404 + 1 = 490. Both ≤ 500. |
| SPL-ORDER | pass | build-snapshot.ts imports `{ BoardConfig, BoardSnapshot, ParseError } from './card-model.js'` — slice 2 depends on slice 1, never the reverse. tsconfig.test.json's include entry requires build-snapshot.ts to exist → rides slice 2. |
| SPL-FILES | pass | All 4 code paths in exactly one slice; zero `D` entries → no rename-straddle possible. |
| SPL-COHERENT | pass | card-model.ts +17 = 3 new exported interfaces appended, no edits to existing code, zero consumers until build-snapshot.ts — reviewable standalone. Slice 2 = one module + its 21-test suite + the 1-line tsconfig registration — one unit. |

## Coverage reconciliation
`git diff --no-renames --name-status|--numstat origin/main...task/021-assemble-board-snapshot` @ origin/main 0495f58:
slice 1: card-model.ts (M, 17). slice 2: build-snapshot.ts (A, 85), build-snapshot.test.ts (A, 404),
tsconfig.test.json (M, 1). original\union = {} · union\original = {}. No `D` entries.

## Findings
None (blocking or advisory). Observation: the branch's own card.md copy still reads reworks.split: 0
while main's canonical card.md reads 1 — expected under "bookkeeping ships via main, not the branch".
