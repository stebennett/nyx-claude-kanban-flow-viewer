---
verdict: pass
---
# Test — CARD-019 (re-run after tests-lens rework)

## Suite
`npm test` (clean tree) → **34/34** across 3 files (parse-card.test.ts grew 30→34: +3 date assertions,
+4 coercion edge-case tests).

## Rework verification (the tests-lens gap)
`parse-card.test.ts` now asserts `model.created` = `'2026-07-01'`, `model.started` = `'2026-07-02'`,
`model.delivered` = `'2026-07-03'` against the full-fields fixture's quoted dates. **Mutation confirmed
independently:** setting `asDateString`'s string branch to `return ''` made that test fail
(`expected '' to be '2026-07-01'`); reverted, green. The gap the tests lens flagged is closed.

## Coverage
`npm run test:coverage` → **100%** stmts/branch/funcs/lines on `parse-card.ts` and `paths.ts` (target
90%); `card-model.ts` is type-only (0 runtime). Aggregate 100/100/100/100 on the core-logic layer.

## Property test
fast-check property for `countCriteria` — 200 runs, seed 20260718, invariants held.

## Lint / types / build
- `npm run lint` → exit 0. `npm run typecheck` (`tsc -b --noEmit`) → exit 0.
- `npm run build` → exit 0; `find dist -name '*.test.*'` → no matches (tarball guard holds).
