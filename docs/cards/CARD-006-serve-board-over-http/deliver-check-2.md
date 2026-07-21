---
verdict: fail
criteria: {DLV-BASE: pass, DLV-BODY-TRUE: fail, DLV-SIZE: pass, DLV-DOCS: pass, DLV-PURITY: pass, DLV-CI: pass}
---
# CARD-006 — deliver-check (slice 2 of 2, PR #59, re-check after self-fix)

## Verdict
fail — one blocking finding (DLV-BODY-TRUE), a new inaccuracy introduced by the prior self-fix.

## Criteria
| id | verdict | evidence |
|---|---|---|
| DLV-BASE | pass | `gh pr view 59`: baseRefName=main, headRefName=feature/006-serve-board-over-http-2. `git merge-base origin/main feature/006-serve-board-over-http-2` = c3d25a5 = `git rev-parse origin/main` — branch cut exactly at slice 1's merged tip. |
| DLV-BODY-TRUE | fail | Live body (post cfa19a2) claims the 5 non-guard-wrapped tests in http-server.test.ts "drive/inject an injected snapshot provider." Read the file: only 1 of 5 (L159-179) sets `options.snapshot`; the other 4 (L75,108,131,144) omit it and use the default `buildSnapshot(options)` against a real `writeFixtureBoard()` tmp dir. The 1-vs-5 guard-wrap count itself is correct (`grep -c "await withServer"` = 5 unwrapped + 1 wrapped in `assertNoNonLoopbackNetwork(assertNoRepoWrites(...))`, L189-217). |
| DLV-SIZE | pass | `git diff --numstat origin/main...feature/006-serve-board-over-http-2`, excluding docs/cards/** (pr-body.md, 21 lines): http-server.ts 45 + http-server.test.ts 218 + index.ts 28 + tsconfig.test.json 1 = 292. Under size_limit 500. Matches split.md's Slice 2 estimate (~292) exactly. |
| DLV-DOCS | pass | Slice-2 diff correctly carries none of implement.md/test.md/review.md (they ride slice 1). Verified present on `main` at docs/cards/CARD-006-serve-board-over-http/{implement,test,review}.md (merged via PR #58) — `ls` confirms all three plus split.md/split-check.md/split-acceptance.md/deliver-1.md/deliver-check-1.md/deliver-check-design.md. deliver-check-2.md deliberately absent at check time (this check's own doc). |
| DLV-PURITY | pass | Non-doc diff is exactly split.md's declared Slice 2 path set: src/server/http-server.ts (added, 45), src/server/http-server.test.ts (added, 218), src/server/index.ts (modified, +20/-8), tsconfig.test.json (modified, +1) — no unrelated files. pr-body.md (+12/-9) is the expected self-fix doc change. |
| DLV-CI | pass | `gh pr checks 59`: Passed 1, Failed 0. No red. |

## Size
actual_lines: 292 (excludes docs/cards/** per size_exclude — pr-body.md's 21 lines omitted). Against card estimated_lines 313 (whole card) and slice 1's measured actual 387: combined actual 387+292=679, matching split.md's stated pre-split branch size. No breach against size_limit 500 on this slice.

## Blocking findings
- **DLV-BODY-TRUE** — body (both "What changed" and the REQ-001 acceptance bullet) claims the 5 non-guard-wrapped tests "drive/inject an injected snapshot provider." Verified against src/server/http-server.test.ts: only 1 of the 5 (L159-179, throwing-provider 500 test) sets `ServerOptions.snapshot`; the other 4 (L75-106, L108-127, L131-142, L144-155) use the default `buildSnapshot(options)` path against a real `writeFixtureBoard()`-created tmp directory, not an injected snapshot function. The corrected 1-vs-5 guard-wrap split is itself accurate — only the injection-mechanism explanation is wrong. Remedy: restate as "run against synthetic fixture board directories, not the target repo; one of the five additionally injects a throwing snapshot provider" — a metadata-only fix, no code change.

## Advisory findings
None.

## Orchestrator note — finding independently confirmed, card parked
Re-ran `grep -n "snapshot:\|it(\|writeFixtureBoard(" src/server/http-server.test.ts` in the
slice-2 worktree: `snapshot:` appears exactly once, at L164, inside the L159 throwing-provider
test. The other five tests each call `writeFixtureBoard(...)` (L76, L109, L132, L145, L190) and
pass no `snapshot` field. The finding is real — the self-fix corrected the guard-wrap count but
introduced a false mechanism claim in the same sentences.

`DLV-BODY-TRUE`'s one self-fix attempt for this PR was spent by commit `cfa19a2` (noted on the
card). Per the deliver self-fix rule — capped at one attempt per criterion per PR — the same
criterion failing again parks the card rather than being edited a third time. Blocker:
`check failed — DLV-BODY-TRUE (self-fix did not clear it)`.

The code is not in question: CI is green, the panel passed the whole branch, and every other
criterion passes. Only the PR #59 body prose is wrong, and the remedy above is exact.
