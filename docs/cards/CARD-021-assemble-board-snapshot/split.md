# CARD-021 — Split — Assemble a board snapshot from cards, config and parse errors

## Verdict
Split into **2 slices**. The 507-line branch (7 over the 500 cap) carves cleanly along a whole-file
boundary that is NOT impl-vs-tests: `src/server/card-model.ts`'s addition is three pure, dependency-free
interfaces (`BoardConfig`, `ParseError`, `BoardSnapshot`) with **zero consumers** in this change set —
nothing else in the diff imports them at the point slice 1 lands, so it typechecks, lints, and tests
green entirely on its own. The larger implementation-plus-its-own-test-suite (`build-snapshot.ts` +
`build-snapshot.test.ts` + `tsconfig.test.json`'s one-line registration) ships together as slice 2, so
neither "untested impl" nor "orphaned test file" ever ships. Both slices independently green.

(Rework note: re-issue of the same carve after split-check.md failed SPL-GREEN on evidence format alone —
boundaries, order, and sizes are unchanged; only the gate evidence below is new pasted output.)

## Environment
Bootstrap: throwaway worktree off `origin/main` (`ac75cd2`), full original change applied
(`git checkout task/021-assemble-board-snapshot -- src/server/build-snapshot.ts
src/server/build-snapshot.test.ts src/server/card-model.ts tsconfig.test.json`), then `npm ci`
(320 packages, 0 vulnerabilities). All 4 gates re-run for real, pasted below.

```
$ npm run lint
> eslint .
EXIT:0
```
```
$ npm run typecheck
> tsc -b --noEmit
EXIT:0
```
```
$ npm test
> vitest run
 ✓ src/server/paths.test.ts (5 tests) 2ms
 ✓ test/ci-workflow.test.ts (6 tests) 8ms
 ✓ src/server/parse-card.test.ts (36 tests) 57ms
 ✓ src/server/build-snapshot.test.ts (21 tests) 170ms
 ✓ test/packaging.test.ts (7 tests) 2350ms
 Test Files  5 passed (5)
      Tests  75 passed (75)
   Duration  2.69s
EXIT:0
```
```
$ npm run build
> vite build
vite v6.4.3 building for production...
✓ 30 modules transformed.
dist/ui/assets/index-BXnY_l6R.js   194.74 kB │ gzip: 60.95 kB
✓ built in 436ms
> tsc -b tsconfig.server.json --force
EXIT:0
```
Environment sound — all 4 gates real-green on the full original change.

## Slices

### Slice 1 — types: BoardConfig / ParseError / BoardSnapshot
- `src/server/card-model.ts` — modified (+17)
- Coheres: a self-contained additive block of 3 new exported interfaces appended to the JSON-contract
  type file. Nothing else in this change set consumes them yet — the slice is exactly "the new API
  contract shapes," in isolation.
- Estimated lines: 17 added, 0 deleted.
- Materialized as: `origin/main` (ac75cd2) + `git checkout task/021-assemble-board-snapshot --
  src/server/card-model.ts` (only this path modified — verified via `git status`).
- Gate output (throwaway worktree, slice 1 alone):
```
$ npm run lint
> eslint .
EXIT:0
```
```
$ npm run typecheck
> tsc -b --noEmit
EXIT:0
```
```
$ npm test
> vitest run
 ✓ src/server/paths.test.ts (5 tests) 2ms
 ✓ test/ci-workflow.test.ts (6 tests) 4ms
 ✓ src/server/parse-card.test.ts (36 tests) 50ms
 ✓ test/packaging.test.ts (7 tests) 2047ms
 Test Files  4 passed (4)
      Tests  54 passed (54)
   Duration  2.30s
EXIT:0
```
```
$ npm run build
> vite build
✓ 30 modules transformed.
✓ built in 442ms
> tsc -b tsconfig.server.json --force
EXIT:0
```

### Slice 2 — buildSnapshot implementation + its test suite
- `src/server/build-snapshot.ts` — added (+85)
- `src/server/build-snapshot.test.ts` — added (+404)
- `tsconfig.test.json` — modified (+1, registers build-snapshot.ts in `include`, the TS6307 fix)
- Coheres: the module and its exhaustive Vitest suite are one unit (ADR-0008 totality behavior + every
  test proving it) — impl and tests never separated. The tsconfig registration is inseparable from
  build-snapshot.ts existing (adding the include entry before the file exists breaks `tsc -b`), so it
  rides here, not slice 1.
- Estimated lines: 490 added, 0 deleted.
- Materialized as: cumulative on top of slice 1 — `git checkout task/021-assemble-board-snapshot --
  src/server/build-snapshot.ts src/server/build-snapshot.test.ts tsconfig.test.json` (all 4 paths staged
  = full original change reconstituted). No deletions in this branch, so no `git rm` needed.
- Gate output (throwaway worktree, slices 1+2 cumulative = full change):
```
$ npm run lint
> eslint .
EXIT:0
```
```
$ npm run typecheck
> tsc -b --noEmit
EXIT:0
```
```
$ npm test
> vitest run
 ✓ src/server/paths.test.ts (5 tests) 2ms
 ✓ test/ci-workflow.test.ts (6 tests) 4ms
 ✓ src/server/parse-card.test.ts (36 tests) 60ms
 ✓ src/server/build-snapshot.test.ts (21 tests) 168ms
 ✓ test/packaging.test.ts (7 tests) 2570ms
 Test Files  5 passed (5)
      Tests  75 passed (75)
   Duration  2.85s
EXIT:0
```
```
$ npm run build
> vite build
✓ 30 modules transformed.
✓ built in 452ms
> tsc -b tsconfig.server.json --force
EXIT:0
```

## Order
1. Slice 1 (types) — builds standalone against `origin/main`.
2. Slice 2 (impl + tests + tsconfig registration) — depends on slice 1: `build-snapshot.ts` does
   `import type { BoardConfig, ParseError, BoardSnapshot } from './card-model.js'`, and its
   tsconfig.test.json registration requires build-snapshot.ts to exist. Must merge after slice 1.

## Coverage
Ground truth — `git diff --no-renames --name-status origin/main...task/021-assemble-board-snapshot`
(size_exclude applied: `docs/cards/**` excluded; no lockfiles touched):

| path | type | lines |
|---|---|---|
| src/server/build-snapshot.test.ts | A | 404 |
| src/server/build-snapshot.ts | A | 85 |
| src/server/card-model.ts | M | 17 |
| tsconfig.test.json | M | 1 |

Original set (4 paths, 507 lines) vs union of slice 1 ∪ slice 2 (4 paths, 17 + 490 = 507 lines):
original \ union = {} · union \ original = {}. No deleted paths — nothing for `git rm` to carry.
