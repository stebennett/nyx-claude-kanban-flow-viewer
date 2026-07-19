---
verdict: pass
---
# CARD-003 Test — Publish npm package and GitHub Release on a vX.Y.Z tag (re-test after rework #1)

## Suite

**Command:** `npm test` → PASS

```
Test Files  5 passed (5)
     Tests  67 passed (67)
```

The 13 release-workflow contract tests all pass, including the two rework additions:
- #5 `guards tag against package.json version` — now pins the literal `'"$GITHUB_REF_NAME" != "v${VERSION}"'`.
- #9 `orders the publish job steps: guard, then install, then build, then publish` — `findIndex`
  order check `guardIndex < npmCiIndex < buildIndex < publishIndex`.
Plus paths.test.ts (5), ci-workflow.test.ts (6), parse-card.test.ts (36), packaging.test.ts (7).

## Coverage

```
% Coverage report from v8
--------------|---------|----------|---------|---------|
File           | % Stmts | % Branch | % Funcs | % Lines |
--------------|---------|----------|---------|---------|
All files      |     100 |      100 |     100 |     100 |
--------------|---------|----------|---------|---------|
```

100% core-logic coverage (exceeds 90%). CARD-003 adds no `src/` runtime code (infra-as-code only).

## Property tests
Not applicable (no numeric/invariant domain logic; the contract tests are deterministic YAML/JSON assertions).

## Lint & types
`npm run lint` → ✓ `ESLint: No issues found`. `npm run typecheck` (`tsc -b --noEmit`) → ✓ (exit 0).

## Build
`npm run build` → ✓ (vite: 30 modules; `tsc -b tsconfig.server.json --force`).
Rollup lockfile integrity: `grep -c 'node_modules/@rollup/rollup-' package-lock.json` = 25 ✓.

## Rework #1 verification
Both tests-lens blocking findings addressed and re-verified green:
1. Version-guard operator direction pinned to the literal comparison (an inverted `==` now fails the test).
2. Publish step order enforced via `findIndex` (guard→ci→build→publish; a reorder now fails the test).
Advisory applied: `GITHUB_TOKEN` env assertion tightened to `.toBe('${{ secrets.GITHUB_TOKEN }}')`.

## Verdict
All gates green. Ready for the [tests] lens re-run (the only outstanding panel lens).
