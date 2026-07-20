---
verdict: pass
criteria: {SLC-VERDICT: pass, SLC-SIZE: pass, SLC-CHILD-VERTICAL: na, SLC-CHILD-AC: na, SLC-NO-LOSS: na, SLC-REWIRE: pass, SLC-DAG: na}
---
# Slice check — CARD-006

## Verdict
pass

## Criteria
| id | verdict | evidence |
|---|---|---|
| SLC-VERDICT | pass | slice.md:8-22 — AC-1/AC-2 argued as one guarded behavior, split-off scaffolding-child alternative explicitly ruled out; matches independent pre-read derivation from card.md's own ACs. |
| SLC-SIZE | pass | Own per-file walk totals ~250-390 lines against the real codebase (src/server/index.ts placeholder, card-model.ts, build-snapshot.ts), well under size_limit: 500; slicer's 320 (slice.md:28-38) defensible and consistent. |
| SLC-CHILD-VERTICAL | na | keep-as-one, proposed_cards: []; no children. |
| SLC-CHILD-AC | na | No split, no child ACs. |
| SLC-NO-LOSS | na | Parent's two ACs kept whole, nothing lost to a split. |
| SLC-REWIRE | pass | CARD-007/008/009/018 each depends_on: [CARD-006] only, no AC overlaps GET /api/board; dependents_rewire: [] correct on no-split. |
| SLC-DAG | na | No children proposed, no child depends_on graph. |

## Size estimate
| File | New/Edit | Checker estimate | Slicer's |
|---|---|---|---|
| src/server/http-server.ts | new | ~50-60 | ~55 |
| src/server/http-server.test.ts | new | ~120-180 | ~150 |
| test/server-guard.ts | new | ~40-100 | ~55 |
| src/server/index.ts | rewrite | ~40-50 | ~46 |
| tsconfig.test.json | edit | ~1 | ~1 |
| **Total** | | **~250-390** | **~320** |

Both estimates land well inside size_limit (500); holds.

## Blocking findings
None.

## Advisory findings
None.
