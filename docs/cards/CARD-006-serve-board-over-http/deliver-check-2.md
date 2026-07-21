---
verdict: fail
criteria: {DLV-BASE: pass, DLV-BODY-TRUE: fail, DLV-SIZE: pass, DLV-DOCS: pass, DLV-PURITY: pass, DLV-CI: pass}
---
# CARD-006 slice 2/2 — deliver-check-2.md

## Verdict
fail — one blocking DLV-BODY-TRUE finding (PR body overstates REQ-001 test-guard coverage).

## Criteria
| id | verdict | evidence |
|---|---|---|
| DLV-BASE | pass | `gh pr view` → baseRefName=main, headRefName=feature/006-serve-board-over-http-2 (matches the dispatch's slice-2 branch, not the card's original branch). |
| DLV-BODY-TRUE | fail | Body claims "every server-level test body runs inside assertNoRepoWrites + assertNoNonLoopbackNetwork" (repeated under the REQ-001 AC bullet); `grep` on http-server.test.ts shows only 1 of 6 tests (the malformed-card totality test, L189-217) actually calls those helpers — the other 5 call `withServer` unwrapped. All other body claims (dispatch loci, status codes, content-type, pathname-exact-match /api/board vs /api/board/, exit 64, 4400/127.0.0.1 bind, coverage 100/90.9/100/100 with the req.url??'/' uncovered branch, 128/128 tests, lint/typecheck clean) verified directly against the diff and by re-running the gates — all true. |
| DLV-SIZE | pass | `git diff --numstat origin/main...feature/006-serve-board-over-http-2`, excluding docs/cards/** (pr-body.md 12+9=21): 218+0 (http-server.test.ts) + 45+0 (http-server.ts) + 20+8 (index.ts) + 1+0 (tsconfig.test.json) = **actual_lines: 292**, under size_limit 500. No size_exclude lock files present. Matches split.md's projected "~292 lines" for slice 2 exactly — no breach, so no further-split question arises. |
| DLV-DOCS | pass | Slice-2 diff carries no implement.md/test.md/review.md — correct, per dispatch these ride slice 1 (PR #58, merged). Verified on `origin/main` in the primary checkout: docs/cards/CARD-006-serve-board-over-http/ contains implement.md, test.md, review.md, split.md, split-check.md, split-acceptance.md, slice.md, slice-check.md, design.md, design-check.md, deliver-check-design.md, deliver-check-1.md, deliver-1.md, deliver-2.md — all present. `checks` policy has every check `on`, so all expected docs, and none is missing. |
| DLV-PURITY | pass | 5 changed files: src/server/http-server.ts (added), src/server/http-server.test.ts (added), src/server/index.ts (modified), tsconfig.test.json (modified), docs/cards/CARD-006-serve-board-over-http/pr-body.md (modified, expected PR-body doc). Matches split.md's `## Slices` → Slice 2 file list exactly (4 code/config paths); no unrelated change. |
| DLV-CI | pass | `gh pr checks` → job "gates": SUCCESS. Not merely pending — actually green. The checker independently re-ran `npm run lint` (clean), `npm run typecheck` (clean), `npm test` (128/128, 9 files) and `npx vitest run --coverage` (100/97.95/100/100 overall; http-server.ts 100/90.9/100/100) in the slice-2 worktree. |

## Size
- `actual_lines: 292` (added+deleted, `docs/cards/**` excluded per size_exclude)
- Excluded: `docs/cards/CARD-006-serve-board-over-http/pr-body.md` (12+9=21 lines) — no lock files present in this diff
- Against `estimated_lines` 313 (whole card) and slice 1's `actual_lines` 387: slice1(387)+slice2(292)=679, matching split.md's stated original-branch total of 679 exactly. No breach on this slice — the split held under its own SPL-SIZE.

## Blocking findings
- **DLV-BODY-TRUE** — PR #59 body ("What changed" bullet + REQ-001 acceptance-criteria bullet) claims "every server-level test body runs inside assertNoRepoWrites + assertNoNonLoopbackNetwork." Only 1 of 6 tests in src/server/http-server.test.ts (the malformed-card totality test, L189-217) actually does; the other 5 (200-payload L75, ?query-200 L108, 404-unknown L131, 404-POST L144, 500-error L159) call `withServer` unwrapped, per `grep -n "assertNoRepoWrites\|assertNoNonLoopbackNetwork" src/server/http-server.test.ts` returning exactly the import line and 2 lines inside the last test only. Remedy: correct the body to scope the guard claim to the one test that exercises it, or wrap the other 5 test bodies in the guard and re-verify, before re-claiming full REQ-001 test coverage.

## Advisory findings
None.

## Orchestrator note — finding independently confirmed
Re-ran `grep -n "assertNoRepoWrites\|assertNoNonLoopbackNetwork\|it(\|withServer(" src/server/http-server.test.ts`
in the slice-2 worktree: 6 `it(` blocks (L75, L108, L131, L144, L159, L189); the guard helpers
appear only at the L8 import and at L197/L198, inside the L189 test. The other five call
`withServer` directly at L84/L117/L135/L148/L169. The finding is real, not a checker
misreading — the PR body's claim is false as written.
