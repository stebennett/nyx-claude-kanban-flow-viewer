---
verdict: pass
criteria: {SPL-NO-LOSS: pass, SPL-GREEN: pass, SPL-SIZE: pass, SPL-ORDER: pass, SPL-FILES: pass, SPL-COHERENT: pass}
---
# CARD-006 — split-check (re-check after SPL-GREEN fix, commit 129404c)

## Verdict
pass — no blocking findings. The corrected `split.md` carries fenced command+output blocks for the
bootstrap and both slices; the pasted vitest banners are internally consistent and independently verified
against the real per-file test counts in the worktree.

## Criteria
| id | verdict | evidence |
|---|---|---|
| SPL-GREEN | pass | split.md §Environment + both slices carry `$ npm ci/lint/typecheck/build/test` fenced output. Bootstrap 9 files/128 tests, slice 1 8/122, slice 2 9/128. Re-derived every per-file test count via `grep -c` on the real files — all 9 match (server-guard.test.ts=17, http-server.test.ts=6, milestones=12, parse-card=36, paths=5, build-snapshot=24, ci-workflow=6, release-workflow=15, packaging=7); 128−6=122 for slice 1 confirmed. |
| SPL-NO-LOSS | pass | `git diff --no-renames --name-status origin/main...feature/006-serve-board-over-http` = 6 pairs (docs/cards/** excluded); slice union = identical 6. original\union = {}, union\original = {}. No deletions. |
| SPL-SIZE | pass | `--numstat` re-summed: slice 1 = 161+226 = 387 ≤500; slice 2 = 45+218+28+1 = 292 ≤500. |
| SPL-ORDER | pass | http-server.test.ts:8 imports test/server-guard.js (slice 1); server-guard.ts imports only node:*; index.ts/tsconfig (slice 2) reference only slice-2 paths. Slice 1 first, slice 2 depends on it. |
| SPL-FILES | pass | All 6 paths in exactly one slice; no duplication; no D/A pairs (no renames to straddle). |
| SPL-COHERENT | pass | Slice 1 = self-contained REQ-001 guard + its 17 tests, reviewable alone. Slice 2 = HTTP server + CLI + tests exercising the merged guard, reviewable alone once slice 1 lands. |

## Coverage reconciliation
Original set (6 pairs, size_exclude applied) = slice union, both differences empty.

## Blocking findings
None.

## Note
First split-check failed SPL-GREEN because the orchestrator condensed the splitter's fenced gate output
into prose when persisting split.md (the recorded [CARD-021] trap). Corrected by restoring the pasted
command+output (commit 129404c); the carve itself passed all criteria on the first check. No pr-splitter
rework spent (the deficiency was persistence, not the carve).
