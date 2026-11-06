---
phase: check
checks: slice
card: CARD-008
verdict: pass
criteria:
  SLC-VERDICT: pass
  SLC-SIZE: pass
  SLC-CHILD-VERTICAL: na
  SLC-CHILD-AC: na
  SLC-NO-LOSS: na
  SLC-REWIRE: pass
  SLC-DAG: na
---

# CARD-008 slice re-check (rework 1) — verdict: pass

## Verdict
**pass** — keep-as-one confirmed independently; SLC-SIZE holds.

## Criteria
| id | verdict | evidence |
|---|---|---|
| SLC-VERDICT | pass | slice.md:4-16 + card.md ACs — the 4 ACs are one endpoint/one response contract; REQ-005/018/035 (spec.md:47,134,267) describe exactly this as a single feature. Splitting would ship a first slice whose main real-world case (worktree wins) doesn't work — reached independently before reading slice.md's rationale, which argues the same. |
| SLC-SIZE | pass | My own bottom-up (central ≈416, range 391-446) against the real codebase, cross-checked against the slicer's (411) and the prior checker's cited (416) — tight convergence. Drift-adjusted centrally ≈483, under size_limit 500. Reconstructed the cited 1.16x factor from split.md/slice.md raw numbers (292/252 = 1.159). |
| SLC-CHILD-VERTICAL | na | proposed_cards: [] (keep-as-one) — no children to verdict. |
| SLC-CHILD-AC | na | No split — no child ACs to check for inheritance. |
| SLC-NO-LOSS | na | Parent's 4 ACs unchanged in card.md — nothing split off to lose. |
| SLC-REWIRE | pass | Grepped all docs/cards/**/card.md for depends_on myself: only CARD-016 (card.md:10, depends_on: [CARD-009, CARD-008]) depends on CARD-008. Keep-as-one means it stays as-is; slice.md:66's "None" is correct. |
| SLC-DAG | na | No child depends_on graph — no children proposed. |

## Size estimate
| File | New/Edit | My estimate | Basis | Slicer's |
|---|---|---|---|---|
| src/server/phase-docs.ts | new | ~70-90 | Matcher (~mirrors hasCheckDoc, 6 lines) + safe readdirSync/ENOENT-swallow + dual-dir read + merge-with-worktree-precedence + source labeling + deterministic sort + JSDoc | ~75 |
| src/server/http-server.ts | edit | ~30-45 | Regex route match + :id extract, card lookup, 404, path build (incl. worktree-relative-to-repo-root resolution), try/catch→500 | ~35 |
| src/server/phase-docs.test.ts | new | ~155-165 | 8 cases × marginal ~16/test (build-snapshot.test.ts's marginal rate: (447-60)/24) + ~30-35 fixed dual-dir fixture-writer/cleanup | ~160 |
| src/server/http-server.test.ts | edit | ~135-145 | 5 cases × marginal ~28/test (http-server.test.ts's own measured marginal rate: (219-53)/6) | ~140 |
| tsconfig.test.json | edit | ~1 | add to include (KNOWLEDGE [CARD-019] convention) | ~1 |
| **Total** | | **~391-446, central ≈416** | | **411** |

Real on-disk calibration (measured, not assumed): parse-card.test.ts is 554 lines/36
tests (15.4/test), build-snapshot.test.ts is 447 lines/24 tests (18.6/test),
http-server.test.ts is 219 lines/6 tests (marginal ≈27.7/test after ~53 lines shared
boilerplate). These underlie the per-file rows above.

1.16x factor verified: split.md's Slice 2 guard-excluded actual = 45(http-server.ts)
+ 218(http-server.test.ts) + 28(index.ts) + 1(tsconfig) = 292; slice.md's guard-excluded
estimate = 55+150+46+1 = 252. 292/252 = 1.159 ≈ 1.16 — a real, reconstructable number.

My central estimate (≈416) converges tightly with the slicer's (411) and the prior
slice-check's cited independent bottom-up (416) — three independently-derived figures
landing within 5 lines of each other is evidence of a genuine reconstruction, not a
number shaped to satisfy the checker. Drift-adjusted centrally: 416 × 1.16 ≈ 483 (97%
of cap) — under, margin real but thin, as the slicer itself characterizes it.
`estimated_lines: 460` sits defensibly between the raw bottom-up and the drift-adjusted
figure.

## Blocking findings
None.

## Advisory findings
- slice.md:23 — the http-server.ts row's basis doesn't address that card.worktree is
  repo-root-relative while options.boardDir is <repo>/docs/cards; naive path.join would
  resolve wrong. Negligible size impact — flagged for the design phase.
- The drift-adjusted top of my estimate's range (~517) would nominally exceed size_limit
  if every file hits its own pessimistic bound simultaneously — not how independent
  variance compounds and not blocking, but implement/test should hold
  phase-docs.test.ts to its scoped ~8 cases.
