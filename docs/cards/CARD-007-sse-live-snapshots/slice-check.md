---
phase: check
checks: slice
card: CARD-007
verdict: pass
criteria:
  SLC-VERDICT: pass
  SLC-SIZE: pass
  SLC-CHILD-VERTICAL: pass
  SLC-CHILD-AC: pass
  SLC-NO-LOSS: pass
  SLC-REWIRE: pass
  SLC-DAG: pass
---

# CARD-007 — Push live snapshots over SSE · slice-check (rework 1)

## Verdict
Pass. The reworked 4-way split correctly remedies the prior round's sole SLC-SIZE
failure by carving the over-budget child along its own two AC2 sub-clauses
(REQ-008 re-parse vs push). All seven SLC-* criteria pass; one advisory (unaddressed
ordinal depends_on format, non-blocking, previously advisory too).

## Criteria
| id | verdict | evidence |
|---|---|---|
| SLC-VERDICT | pass | 4-way split directly targets the failing combined child (428-463/500 last round) via a legitimate split-by-acceptance-criterion boundary (AC2's re-parse vs push clauses); not splitting for its own sake. |
| SLC-SIZE | pass | Re-derived per-file from the real codebase (http-server.ts ~45 lines today, build-snapshot.ts 104 lines, tsconfig.test.json's actual explicit-include list, KNOWLEDGE.md:192-193's [CARD-019] tsconfig entry cited verbatim). All four children land 187-255 by my own reconstruction, comfortably under the 500 cap. Slicer's 195/248/187/240 are defensible. |
| SLC-CHILD-VERTICAL | pass | Verified CARD-021 (docs/cards/CARD-021-assemble-board-snapshot/card.md): status done, right_sized true, its ACs asserted by direct invocation of buildSnapshot() with zero HTTP wiring, later wired into GET /api/board by a separate card (CARD-006). Child 2's watchBoard()->onSnapshot() is the same shape — a directly-observable, directly-testable module whose only consumer arrives in child 3, exactly mirroring the accepted precedent. Not scaffolding. |
| SLC-CHILD-AC | pass | Every child AC is observable and traces to a parent AC (see SLC-NO-LOSS); added ACs (2nd concurrent connection in child 1, close() in child 2) are hygiene elaborations, not contradictions. |
| SLC-NO-LOSS | pass | Parent AC1 -> child1 AC1. Parent AC2 splits into child2 AC1 (re-parse clause, REQ-006/REQ-008) + child3 AC1 (push clause, REQ-008/REQ-017). Parent AC3 -> child4 AC1. Union covers all three parent ACs. |
| SLC-REWIRE | pass | Grepped depends_on:.*CARD-007 across docs/cards/: only CARD-012 (depends_on: [CARD-009, CARD-007]). Rewire target is the terminal child ("Debounce rapid board changes into one live snapshot"), matching CARD-012 AC2's need for live+debounced updates. Correct and complete. |
| SLC-DAG | pass | Graph 1->CARD-006, 2->CARD-006, 3->[1,2], 4->[3] is acyclic with no forward references and only sibling/real-card targets. Advisory: children 3/4's depends_on still uses bare ordinals rather than sibling titles/CARD ids (card-slicer.md's documented shape) — unaddressed from the prior round, where it was also advisory (SLC-DAG passed then too), unambiguous given a 4-item list, so non-blocking here as well. |

## Size estimate
My own reconstruction, formed before reading slice.md's numbers in full:

| child | files | my estimate | slicer's estimate | holds? |
|---|---|---|---|---|
| 1 SSE endpoint on connect | http-server.ts ~65, http-server.test.ts ~110-140 | ~195 | 195 | yes |
| 2 Watch board dir -> fresh snapshot | watcher.ts ~50-80 (new), watcher.test.ts ~140-190 (new), tsconfig.test.json +2, package.json +1 | ~240-255 | 248 | yes |
| 3 Push to SSE clients | index.ts ~20-25, live-events.test.ts ~140-180 (new) | ~185-195 | 187 | yes |
| 4 Debounce | watcher.ts +40, watcher.test.ts +90, live-events.test.ts +110 | ~230-250 | 240 | yes |

Confirmed writeFixtureBoard/withServer are NOT exported from http-server.test.ts or
build-snapshot.test.ts — each is a local, duplicated helper per file; slice.md's
"reusing writeFixtureBoard, per build-snapshot.test.ts's pattern" correctly means
re-implementing the pattern, not importing it, and its line estimate for
watcher.test.ts already accounts for that duplication.

On the dispatch's framing that 248+187=435 is "noticeably below" the prior
combined-child range of 428-463: it is not — 435 lies inside that range, not below
its floor. No evidence anything was quietly dropped in the carve; see SLC-NO-LOSS.

All four children hold well clear of size_limit=500, with a large margin even
against this repo's demonstrated 2x-2.2x slice-to-actual drift (CARD-006: 313->679,
2.17x; CARD-019: 300->601, 2.0x — both independently confirmed from their card.md).

## Blocking findings
None.

## Advisory findings
- Ordinal depends_on ([1, 2], [3]) in the ## Proposed cards section for children 3
  and 4 (slice.md:135, :143) deviates from card-slicer.md's documented
  sibling-title/CARD-id shape. Left unfixed from the prior round; still advisory
  (unambiguous, prior SLC-DAG passed on the same style) but worth fixing next time
  to avoid a third recurrence.
