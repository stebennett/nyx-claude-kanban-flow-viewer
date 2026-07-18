---
verdict: pass
---
# Test — CARD-019: Parse card.md frontmatter and body into the card model

## Suite
`npm test` (clean tree after `npm ci`) → **30/30**:
```
✓ src/server/paths.test.ts (5 tests)
✓ src/server/parse-card.test.ts (18 tests)
✓ test/packaging.test.ts (7 tests)  — incl. "ships no test files in the published tarball"
Test Files  3 passed (3)   Tests  30 passed (30)
```

## Coverage
`npm run test:coverage` → **100%** on the core-logic layer:
```
parse-card.ts | 100 | 100 | 100 | 100
paths.ts      | 100 | 100 | 100 | 100
card-model.ts |   0 |   0 |   0 |   0   (pure interfaces, no runtime code)
```
Aggregate across `src/server/**/*.ts` minus `index.ts`: 100% — exceeds the 90% target.

## Property test
fast-check property for `countCriteria` present and passing (invariants `done ≤ total`, `done ≥ 0`,
`total ≥ 0`). implement.md's mutation proof (mutate `total` → `done+notDone+1`) fails after 1 run,
shrinking to `[]` — the property has teeth.

## Lint & types
- `npm run lint` → exit 0 (ESLint: No issues found)
- `npm run typecheck` (`tsc -b --noEmit`) → exit 0. **`@types/gray-matter` deliberately absent** and
  typecheck still green — gray-matter ships its own bundled types via package.json `typings`.

## Build
- `npm run build` → exit 0; `card-model` + `parse-card` compile into `dist/server`; **no `*.test.*`
  shipped** (the CARD-001 tarball guard holds).

## Spot-checks (both implement deviations)
- `npm ls gray-matter` → `gray-matter@4.0.3` resolved as a runtime dependency.
- `test/packaging.test.ts` deps assertion now `expect(Object.keys(pkg.dependencies ?? {})).toEqual(['gray-matter'])` — passes (ADR-0005 amends ADR-0002).

All gates green; no blockers.
