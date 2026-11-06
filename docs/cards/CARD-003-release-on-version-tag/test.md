---
verdict: pass
---
# CARD-003 Test — Publish npm package and GitHub Release on a vX.Y.Z tag (re-test after rework #2)

## Suite
`npm test` → PASS
```
✓ src/server/paths.test.ts (5)
✓ test/ci-workflow.test.ts (6)
✓ test/release-workflow.test.ts (13)
✓ src/server/parse-card.test.ts (36)
✓ test/packaging.test.ts (7)
Test Files  5 passed (5)
     Tests  67 passed (67)
```
The 13 release-workflow contract tests pass, including the rework #2 addition: the Release step is now
asserted to reference the pushed tag (`$GITHUB_REF_NAME` / `github.ref_name`), catching a hardcoded-tag
mutation (AC-4).

## Coverage
100% stmts/branch/funcs/lines on core logic (exceeds 90%). No `src/` runtime code added by this card.

## Property tests
Not applicable (no numeric/invariant domain logic).

## Lint & types
`npm run lint` → ✓ no issues. `npm run typecheck` (`tsc -b --noEmit`) → ✓ (exit 0).

## Build
`npm run build` → ✓ (vite 30 modules; `tsc -b tsconfig.server.json --force`).
Rollup lockfile integrity: `grep -c 'node_modules/@rollup/rollup-' package-lock.json` = 25 ✓.

## Verdict
All gates green after rework #2. Ready for the final `[tests]` lens re-run.
