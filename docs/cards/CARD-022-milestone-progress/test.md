---
verdict: pass
---
# CARD-022 — Milestone progress in the board snapshot — test

## Suite

**Command:** `npm test`

```
Test Files  7 passed (7)
     Tests  104 passed (104)

 ✓ test/ci-workflow.test.ts (6 tests)
 ✓ src/server/paths.test.ts (5 tests)
 ✓ test/release-workflow.test.ts (15 tests)
 ✓ src/server/milestones.test.ts (11 tests)
 ✓ src/server/parse-card.test.ts (36 tests)
 ✓ src/server/build-snapshot.test.ts (24 tests)
 ✓ test/packaging.test.ts (7 tests)
```

New `src/server/milestones.test.ts` — 11 tests: 6 `parseMilestones` (two-milestone fixture,
no-`**Cards:**` line, empty string, intro-only, stray-`**Cards:**`-under-non-milestone-heading,
whitespace-only `**Cards:**` line) + 5 `deriveMilestones` (mixed statuses, all-done, missing+backlog,
split/superseded not counted, seeded fast-check property).

## Coverage

**Command:** `npx vitest run --coverage`

```
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |     100 |    98.85 |     100 |     100 |
 build-snapshot.ts |     100 |    95.83 |     100 |     100 | 9
 card-model.ts     |     100 |      100 |     100 |     100 |
 milestones.ts     |     100 |      100 |     100 |     100 |
 parse-card.ts     |     100 |      100 |     100 |     100 |
 paths.ts          |     100 |      100 |     100 |     100 |
-------------------|---------|----------|---------|---------|-------------------
```

Core logic `milestones.ts`: 100/100/100/100 — exceeds the 90% target. Line 9 of `build-snapshot.ts`
(`String(err)` fallback) is pre-existing, unrelated to this card.

## Property tests
Seeded fast-check in `milestones.test.ts` (seed `20260720`, 50 runs): invariants `0 <= done <= total`,
`total === cardIds.length`, `done === cardIds.filter(id => doneIds.has(id)).length` (expected derived
from the arbitrary's own tags). All pass.

## Lint & types & build
- `npm run lint` → ESLint: No issues found.
- `npm run typecheck` (`tsc -b --noEmit`) → clean.
- `npm run build` → Vite (30 modules) + `tsc -b tsconfig.server.json --force` → clean.

## Verdict
pass — every gate green, coverage above target.
