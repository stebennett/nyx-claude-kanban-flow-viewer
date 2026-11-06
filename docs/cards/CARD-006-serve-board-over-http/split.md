# CARD-006 — split.md

## Verdict
Split into **2 slices**. The reviewed branch diff (excluding `docs/cards/**`, per `size_exclude`) totals
679 changed lines vs `size_limit` 500. The change set decomposes cleanly along an existing import
boundary: `http-server.test.ts` imports `test/server-guard.ts`, so the guard is a self-contained
dependency that must ship first. No other cross-reference exists between the two groups. Both slices
verified green in a throwaway worktree; no refusal needed.

## Environment
Bootstrapped `/tmp/kanban-split-CARD-006` off `origin/main` (db10249), applied the WHOLE original change
(all 6 non-excluded paths checked out from `feature/006-serve-board-over-http`; no deletions), `npm ci`,
then the real gates:

```
$ npm ci
added 320 packages, and audited 321 packages in 2s
found 0 vulnerabilities

$ npm run lint          # eslint .
(no output — clean)

$ npm run typecheck     # tsc -b --noEmit
(no output — clean)

$ npm run build         # vite build && tsc -b tsconfig.server.json --force
vite v6.4.3 building for production...
✓ 30 modules transformed.
dist/ui/index.html                   0.40 kB
dist/ui/assets/index-CWdgqL9S.css    0.10 kB
dist/ui/assets/index-BXnY_l6R.js   194.74 kB
✓ built in 433ms

$ npm test              # vitest run
 ✓ test/ci-workflow.test.ts (6 tests)
 ✓ test/release-workflow.test.ts (15 tests)
 ✓ test/server-guard.test.ts (17 tests)
 ✓ src/server/milestones.test.ts (12 tests)
 ✓ src/server/http-server.test.ts (6 tests)
 ✓ src/server/parse-card.test.ts (36 tests)
 ✓ src/server/paths.test.ts (5 tests)
 ✓ src/server/build-snapshot.test.ts (24 tests)
 ✓ test/packaging.test.ts (7 tests)
 Test Files  9 passed (9)
      Tests  128 passed (128)
```
Green → the environment is sound; every result below is a real statement about the slice carve.

## Slices

### Slice 1 — shared REQ-001 guard (~387 lines)
Paths (change type):
- `test/server-guard.ts` — **added** (161)
- `test/server-guard.test.ts` — **added** (226)

Coherence: the dependency-free shared guard (`digestTree`/`assertNoRepoWrites`/`assertNoNonLoopbackNetwork`,
ADR-0011) and its 17 self-tests. Imports only `node:*` — no dependency on `http-server.ts` or anything in
slice 2. Stands alone. Materialized on `origin/main` with only these two `added` paths checked out (`git
checkout`, no `git rm`).

```
$ npm run lint          # eslint .
(no output — clean)
$ npm run typecheck     # tsc -b --noEmit
(no output — clean)
$ npm run build         # vite build && tsc -b tsconfig.server.json --force
✓ 30 modules transformed. ✓ built in 427ms; tsc -b --force (no output — clean)
$ npm test              # vitest run
 ✓ test/ci-workflow.test.ts (6 tests)
 ✓ test/release-workflow.test.ts (15 tests)
 ✓ test/server-guard.test.ts (17 tests)
 ✓ src/server/milestones.test.ts (12 tests)
 ✓ src/server/parse-card.test.ts (36 tests)
 ✓ src/server/paths.test.ts (5 tests)
 ✓ src/server/build-snapshot.test.ts (24 tests)
 ✓ test/packaging.test.ts (7 tests)
 Test Files  8 passed (8)
      Tests  122 passed (122)
```
(128 total minus the 6 `http-server.test.ts` tests not yet present = 122 — consistent.)

### Slice 2 — HTTP server + CLI wiring (~292 lines)
Paths (change type):
- `src/server/http-server.ts` — **added** (45)
- `src/server/http-server.test.ts` — **added** (218)
- `src/server/index.ts` — **modified** (+20/-8)
- `tsconfig.test.json` — **modified** (+1)

Coherence: the node:http `createServer` factory serving `GET /api/board`, its test suite (imports
`test/server-guard.ts` to prove REQ-001 live), the CLI entry rewrite, and the test-project include.
Depends on slice 1 — ships after. Materialized cumulatively (slice 1 + slice 2 paths, all `added`/
`modified`, no `git rm`); this cumulative state equals the full original change set.

```
$ npm run lint          # eslint .
(no output — clean)
$ npm run typecheck     # tsc -b --noEmit
(no output — clean)
$ npm run build         # vite build && tsc -b tsconfig.server.json --force
✓ 30 modules transformed. ✓ built in 434ms; tsc -b --force (no output — clean)
$ npm test              # vitest run
 ✓ test/release-workflow.test.ts (15 tests)
 ✓ test/server-guard.test.ts (17 tests)
 ✓ src/server/milestones.test.ts (12 tests)
 ✓ src/server/http-server.test.ts (6 tests)
 ✓ src/server/parse-card.test.ts (36 tests)
 ✓ src/server/build-snapshot.test.ts (24 tests)
 ✓ test/ci-workflow.test.ts (6 tests)
 ✓ src/server/paths.test.ts (5 tests)
 ✓ test/packaging.test.ts (7 tests)
 Test Files  9 passed (9)
      Tests  128 passed (128)
```
Matches the full-branch bootstrap and `implement.md`'s 128/128 — slice 2 reproduces the whole change with
no drift.

## Order
1. Slice 1 — shared REQ-001 guard (no dependency; builds against `origin/main` alone).
2. Slice 2 — HTTP server + CLI wiring — depends on slice 1 (`http-server.test.ts` imports
   `test/server-guard.ts`; ships only after slice 1 merges to `main`).

## Coverage (SPL-NO-LOSS)
Original change set (6 `(path, type)` pairs, `docs/cards/**` excluded): http-server.test.ts (A),
http-server.ts (A), index.ts (M), server-guard.test.ts (A), server-guard.ts (A), tsconfig.test.json (M).
Union of slice 1 {server-guard.ts, server-guard.test.ts} + slice 2 {http-server.ts, http-server.test.ts,
index.ts, tsconfig.test.json} = all 6. `original \ union = {}` · `union \ original = {}` — no path lost,
none duplicated, no deletion in this change set.
