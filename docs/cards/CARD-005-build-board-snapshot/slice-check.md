---
verdict: pass
criteria: {SLC-VERDICT: pass, SLC-SIZE: pass, SLC-CHILD-VERTICAL: pass, SLC-CHILD-AC: pass, SLC-NO-LOSS: pass, SLC-REWIRE: pass, SLC-DAG: pass}
---
# Slice check — CARD-005

## Verdict
Pass. The split into a core-snapshot child and a milestones child is genuinely
justified — an independent keep-as-one estimate (two derivation paths, ~350-400
and ~580-590) brackets the 500-line ceiling with real breach risk, corroborating
slice.md's own "~460-510" claim in direction. AC-4 (parseErrors) is correctly fused
into Child 1 rather than split further, since KNOWLEDGE [CARD-019] establishes
`parseCard` is not total — a walk without try/catch is unsafe, not a smaller slice.
Both children re-size comfortably under `size_limit` by independent estimate,
the union of their ACs covers all 4 parent ACs with nothing dropped, the sole real
dependent (CARD-006) is correctly rewired to the last child alone (DAG-sound via
transitivity), and the child dependency graph is acyclic. Three advisory findings on
evidence quality/citation accuracy — none change the correctness of the split.

## Criteria
| id | verdict | evidence |
|---|---|---|
| SLC-VERDICT | pass | Independent re-derivation: keep-as-one ≈350-590 across two methods, bracketing the 500 cap. AC-3 (milestones) is a genuine seam (separate source file `MILESTONES.md`, additive to `cards`). AC-4 correctly fused to Child 1 per KNOWLEDGE [CARD-019] (`parseCard` not total). |
| SLC-SIZE | pass | Independent per-file estimate: Child 1 ≈260-360 (52-72%), Child 2 ≈220-280 (44-56%); slicer's 340/280 — both defensible and comfortably under 500. |
| SLC-CHILD-VERTICAL | pass | Child 1 ships a working, independently fixture-tested `buildSnapshot()` spanning fs read to assembly; Child 2 adds a wholly new end-to-end parsed source (`MILESTONES.md`) as an observable field. Neither is a horizontal layer cut. |
| SLC-CHILD-AC | pass | AC-1's 6 fields split {generatedAt, projectName, config, cards, parseErrors} → Child 1, {milestones} → Child 2; AC-2 → Child 1; AC-3 → Child 2; AC-4 → Child 1. Faithful to card.md's ACs. |
| SLC-NO-LOSS | pass | Union of Child 1 + Child 2 ACs = {AC-1, AC-2, AC-3, AC-4} = all 4 parent ACs; nothing dropped, nothing invented. |
| SLC-REWIRE | pass | Grepped all card.md for `depends_on:.*CARD-005`: only CARD-006 is a real dependent. Rewire to Child 2 alone is DAG-correct via transitivity through Child 1. |
| SLC-DAG | pass | Child 1 → {CARD-019, CARD-020} (done); Child 2 → {Child 1, CARD-019, CARD-020}. Acyclic, no forward references. |

## Size estimate
Keep-as-one (independent, two methods): ≈350-400 (file-by-file) and ≈580-590
(reconstructed from children's own tables, minus merge savings) — both corroborate
a real ceiling threat; slice.md's "~460-510" sits between them.
Child 1 (independent): ≈260-360 (52-72%); slicer: 340 (68%). Holds.
Child 2 (independent): ≈220-280 (44-56%); slicer: 280 (56%). Holds.

## Blocking findings
None.

## Advisory findings
- SLC-VERDICT: slice.md's "~460-510" keep-as-one figure has no per-file working and
  is not reconciled against the children's own table sum (621), an inverted, unexplained
  direction versus the CARD-004 precedent's explicit reconciliation.
- SLC-REWIRE: slice.md misattributes the "depend on last child only" reasoning to
  "KNOWLEDGE" when it is actually a slice-check advisory finding on CARD-004
  (docs/cards/CARD-004-parse-card-model/slice-check.md), not a KNOWLEDGE.md entry.
- SLC-CHILD-AC: slice.md never cites AC numbers per child (unlike CARD-004's slice.md),
  requiring manual inference of the AC-to-child mapping.
