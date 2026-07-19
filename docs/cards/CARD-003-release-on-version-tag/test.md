---
verdict: pass
---
# CARD-003 Test — Publish npm package and GitHub Release on a vX.Y.Z tag

## Suite

**Command:** `npm test` (full test suite with Vitest v3.2.7)

**Result:** PASS
```
Test Files  5 passed (5)
     Tests  66 passed (66)
  Start at  07:54:35
  Duration  2.92s
```

All tests pass including:
- `test/ci-workflow.test.ts` (6 tests) — existing CI workflow contract
- `src/server/paths.test.ts` (5 tests) — core path logic
- **`test/release-workflow.test.ts` (12 tests) — new contract tests (all pass)**
- `src/server/parse-card.test.ts` (36 tests) — core card parsing
- `test/packaging.test.ts` (7 tests) — npm tarball contract

The 12 new release-workflow tests verify the design acceptance criteria: repository.url for
provenance; trigger glob `v[0-9]+.[0-9]+.[0-9]+`; CI gate reuse (`jobs.gates.uses === './.github/workflows/ci.yml'`);
`jobs.publish.needs` includes `gates`; version guard (`require('./package.json').version` + `exit 1`);
SHA-pin shape on every non-local `uses:` with version comment; setup-node 20 + npm registry;
`npm ci` → `npm run build` → publish with `--provenance` + `NODE_AUTH_TOKEN`; least-privilege
permissions (`contents: read` top-level, `contents: write` + `id-token: write` on publish); no bare
`npm install`; `gh release create --generate-notes`; no gate-bypassing escape hatches
(`continue-on-error`, skipping `if:`). Expected values are design literals, not read back from the file.

## Coverage

**Command:** `npm test -- --coverage` (Vitest v8 coverage)

**Result:** PASS
```
% Coverage report from v8
--------------|---------|----------|---------|---------|-------------------
File          | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------|---------|----------|---------|---------|-------------------
All files     |     100 |      100 |     100 |     100 |
 card-model.ts|     100 |      100 |     100 |     100 |
 parse-card.ts|     100 |      100 |     100 |     100 |
 paths.ts     |     100 |      100 |     100 |     100 |
--------------|---------|----------|---------|---------|-------------------
```

Core logic coverage is **100%** (exceeds the 90% target). Per design: no `src/` runtime code is added,
so the core-logic coverage target is untouched by this card; it was 100% before and remains 100%.

## Property tests

None required. Per design: no numeric/invariant domain logic in this card (CI workflow YAML, a
contract test, and a package.json field).

## Lint & types

**Lint:** `npm run lint` → `ESLint: No issues found` ✓

**Typecheck:** `npm run typecheck` (`tsc -b --noEmit`, strict) ✓ — clean compilation. The new
`test/release-workflow.test.ts` is auto-covered by `tsconfig.test.json`'s `**/*.test.ts` glob (no
tsconfig edit needed).

## Build

**Command:** `npm run build` (`vite build` for UI, then `tsc -b tsconfig.server.json --force` for server)

**Result:** PASS
```
vite v6.4.3 building for production...
✓ 30 modules transformed.
dist/ui/index.html                   0.40 kB │ gzip:  0.27 kB
dist/ui/assets/index-CWdgqL9S.css    0.10 kB │ gzip:  0.11 kB
dist/ui/assets/index-BXnY_l6R.js   194.74 kB │ gzip: 60.95 kB
✓ built in 511ms
> tsc -b tsconfig.server.json --force
```

Build succeeds end-to-end. No build artifacts modified by this card (ADR-0002/0003 layout already
present from CARD-001).

## Lockfile integrity check

**Command:** `grep -c 'node_modules/@rollup/rollup-' package-lock.json`

- **Before npm ci:** 25 ✓
- **After npm ci:** 25 ✓

Lockfile remains healthy (not collapsed to 1). Per KNOWLEDGE [CARD-002]/[CARD-003], a collapsed
rollup lock breaks `npm run build` on CI's ubuntu runner. Passed through `npm ci` uncorrupted.

## Verdict

All 7 gates pass (suite, coverage, property N/A, lint, typecheck, build, lockfile integrity). No
blocking findings. Implementation matches the design's `## Interfaces` block verbatim, including the
resolved SHA pins (`actions/checkout@11bd71901…# v4.2.2`, `actions/setup-node@39370e39…# v4.1.0`).
Ready for the review panel.
