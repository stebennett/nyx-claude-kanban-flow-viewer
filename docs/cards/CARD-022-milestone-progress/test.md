---
verdict: pass
---
# CARD-022 — Milestone progress in the board snapshot — test (post-CRLF-rework)

## Suite
`npm test`:
```
 ✓ src/server/paths.test.ts (5 tests)
 ✓ test/ci-workflow.test.ts (6 tests)
 ✓ test/release-workflow.test.ts (15 tests)
 ✓ src/server/milestones.test.ts (12 tests)   ← +1 CRLF regression (was 11)
 ✓ src/server/parse-card.test.ts (36 tests)
 ✓ src/server/build-snapshot.test.ts (24 tests)
 ✓ test/packaging.test.ts (7 tests)

 Test Files  7 passed (7)
      Tests  105 passed (105)
```

## Coverage
`npx vitest run --coverage` — overall 100% stmts / 98.85% branch / 100% funcs / 100% lines.
`milestones.ts` 100/100/100/100 (CRLF split fully exercised). All core-logic files ≥ 90%.

## Property tests
Seeded fast-check in `milestones.test.ts` (seed `20260720`, 50 runs): `0 <= done <= total`,
`total === cardIds.length`, `done === cardIds.filter(id => doneIds.has(id)).length` (oracle from the
arbitrary's own tags). All 50 runs pass.

## Lint & types & build
- `npm run lint` → ESLint: No issues found.
- `npm run typecheck` (`tsc -b --noEmit`) → clean.
- `npm run build` → Vite (30 modules) + `tsc -b tsconfig.server.json --force` → clean.

## CRLF fix verification
`ed03641` changed `parseMilestones` to `raw.split(/\r\n|\n/)`; regression test (milestones.test.ts:70-79)
asserts CRLF and LF fixtures parse identically. Green.

## Verdict
pass — every gate green, coverage above target, CRLF regression covered.
