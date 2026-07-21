---
verdict: pass
criteria: {SLC-VERDICT: pass, SLC-SIZE: pass, SLC-CHILD-VERTICAL: pass, SLC-CHILD-AC: pass, SLC-NO-LOSS: pass, SLC-REWIRE: pass, SLC-DAG: pass}
---
# CARD-018 slice-check

## Criteria
| id | verdict | evidence |
|---|---|---|
| SLC-VERDICT | pass | Independent whole-card estimate ~650-780 lines (own file walk, pre-read of slice.md) vs size_limit 500 — split is necessary. |
| SLC-SIZE | pass | Recomputed all 4 children independently; slight under-estimates on children 2/3's test files, but none approach 500 even re-estimated generously (child 2 ~195, child 3 ~315-335). No ceiling breach. |
| SLC-CHILD-VERTICAL | pass | Each child independently observable via existing GET /api/board (CARD-006): board-dir served, exit-code+message, port bound, browser opens/suppressed. |
| SLC-CHILD-AC | pass | Child ACs (slice.md:102-141) map 1:1 to parent ACs/REQs (card.md:36-39): child1<->AC-2/REQ-012, child2<->AC-4/REQ-014, child3<->AC-1/REQ-011, child4<->AC-3/REQ-013. |
| SLC-NO-LOSS | pass | Union of 4 children's ACs covers all 4 parent ACs; nothing dropped. |
| SLC-REWIRE | pass | Grepped depends_on across all docs/cards/**/card.md myself: zero cards depend_on CARD-018. dependents_rewire: [] (slice.md:49) correct. |
| SLC-DAG | pass | 1->CARD-006 (real card), 2->[1], 3->[2], 4->[3] (slice.md:99-140): acyclic, real-card/sibling-numeral references only. |

## Size estimate

My own whole-card walk (pre-read), calibrated against this repo's real ratios (milestones.ts 73->181=2.5x,
parse-card.ts 158->554=3.5x, http-server.ts 46->219=4.8x for real-socket I/O):

| file | est. lines |
|---|---|
| args.ts (new, full 3-flag) | ~65 |
| args.test.ts (new) | ~180-200 |
| validate-board.ts (new) | ~40 |
| validate-board.test.ts (new) | ~110-140 |
| listen-with-retry.ts (new) | ~50 |
| listen-with-retry.test.ts (new) | ~150-200 |
| open-browser.ts (new) | ~40 |
| open-browser.test.ts (new) | ~90 |
| index.ts (edit, full wiring) | ~55 |
| **My total** | **~630-780** |

Slicer's total: ~605 (whole-card) / 644 (sum of children). Holds — both clear size_limit 500 by a wide margin.

Per-child: child1 slicer 130 / mine ~140 (close); child2 slicer 125 / mine ~195 (test file light, still 305
lines of headroom); child3 slicer 220 / mine ~315-335 (real-socket test light vs http-server.test.ts's own
4.8x ratio, still well clear); child4 slicer 169 / mine ~179 (close). No child approaches 500 either way.

## Blocking findings
None.

## Advisory findings
- slice.md:38-40 — "established pattern (CARD-006/007/008 chained)" is factually wrong: CARD-007/008/009 each
  depend directly on CARD-006 in parallel, not on each other (verified by grep). The avoid-file-conflict
  rationale for chaining still stands on its own merits; the cited precedent doesn't exist.
- slice.md:37 — prose claims "each also carries CARD-006 in depends_on" but only child 1 literally lists it
  (slice.md:99); children 2-4 reach it transitively. Functionally fine (same pattern accepted as advisory in
  CARD-004/CARD-005 slice-checks), but overstates the literal data.
- slice.md:71,80 — validate-board.test.ts (75) and listen-with-retry.test.ts (110) read light against this
  repo's real-I/O test ratios; slice.md:80's own note cites "the high end of ~2-5x" then applies ~2.4x.
  Doesn't change any verdict (both children stay well under 500 even re-estimated), but worth tightening.

## Orchestrator note
Advisory findings never rework. The first advisory (a fabricated precedent) is left standing in `slice.md`
as the producer's own record; the correction lives here, and the children's `## Notes` carry the real
rationale (avoiding same-file conflicts on `args.ts`/`index.ts`) rather than the invented precedent.
The two test-file under-estimates are carried onto CARD-024 and CARD-025's `## Notes` so the design phase
budgets them properly.
