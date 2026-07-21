---
phase: test
card: CARD-023
verdict: pass
---

# CARD-023 — test

## Suite
```
$ npm test
> vitest run
 Test Files  10 passed (10)
      Tests  151 passed (151)
```
Independently re-run (not restating implement.md's claim) — matches 151/151.

## Coverage
RTK's default hook rewrites `vitest run --coverage` output into a truncated JSON blob;
bypassed with `rtk proxy npx vitest run --coverage` to get the real text-reporter table:
```
% Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |     100 |     98.3 |     100 |     100 |
 args.ts           |     100 |      100 |     100 |     100 |
 build-snapshot.ts |     100 |    95.83 |     100 |     100 | 9
 card-model.ts     |     100 |      100 |     100 |     100 |
 http-server.ts    |     100 |     90.9 |     100 |     100 | 20
 milestones.ts     |     100 |      100 |     100 |     100 |
 parse-card.ts     |     100 |      100 |     100 |     100 |
 paths.ts          |     100 |      100 |     100 |     100 |
-------------------|---------|----------|---------|---------|-------------------
```
`args.ts` (this card's file) is 100/100/100/100, comfortably over `coverage_target` 90. Matches
implement.md's reported numbers exactly — no discrepancy.

## Property tests
Both fast-check properties in `src/server/args.test.ts` ran as part of the 151 (23 tests in that
file, includes 2 properties) and passed. Verified: seed pinned at `{seed: 20260721, numRuns: 200}`
on both; the order-independence property asserts a literal ground-truth object
(`{ok:true, args:{targetRepo:repo, boardDir:dir}}`) against both call orders, not merely a
differential between `flagFirst`/`flagLast` — so it cannot pass vacuously by both sides degrading
identically. `boardDirArb` was tightened from the design's `/^[a-z0-9_-]{1,8}$/` segment to
`/^[a-z0-9][a-z0-9_-]{0,7}$/` (must start alphanumeric): the original could generate an all-dash
segment (e.g. `--`), which `parseArgs` correctly reads as an unknown/awaited-option token rather
than a value — the property would have falsely failed on a *correct* implementation. The tightened
arbitrary still spans 1-3 segments of up to 8 alnum/dash/underscore chars each; not narrowed to
vacuity.

## Lint & types
```
$ npm run lint        → eslint .          → "ESLint: No issues found", exit 0
$ npm run typecheck   → tsc -b --noEmit   → (no output), exit 0
$ npm run build       → vite build ✓ + tsc -b tsconfig.server.json --force, exit 0
```

## Additional card-specific verification
- **Two-board discriminator**: `src/server/args.test.ts:215-225` writes ONE temp repo with TWO
  boards — `docs/cards/config.md` = `'---\nwip_limit: 2\n---\n'` + CARD-001, `boards/alt/config.md`
  = `'---\nwip_limit: 7\n---\n'` + CARD-777 — real frontmatter fences on both, so gray-matter parses
  real `wip_limit` values rather than falling back to the default 3. Both end-to-end tests
  (`args.test.ts:228-284`) assert the served `cards[].id` AND `config.wipLimit` differ correctly
  between the default and `--board-dir boards/alt` runs.
- **No leftover mutation**: `git status` clean; `src/server/args.ts` read in full — `parseArgs`
  processes tokens in a single left-to-right walk with no positional-first requirement (the
  "accepts the flag before the positional" test at args.test.ts:53 passes); `resolvePaths`
  (args.ts:101-108) uses `args.boardDir` directly, contains no reference to `DEFAULT_BOARD_DIR`.
- **Harness move**: `test/board-fixture.ts` exports `writeFixtureTree`/`cleanupFixtures`/
  `withServer`; `src/server/http-server.test.ts` imports all three and its original 6 tests (GET
  /api/board ×2, unmatched routes ×2, 500 contract ×1, totality+REQ-001 guard ×1) are present and
  green.
- **Size**: `git diff --numstat origin/main -- . ':(exclude)package-lock.json'
  ':(exclude)docs/cards/**'` re-derived independently → **463 added / 55 deleted**, matching
  implement.md exactly, under `size_limit` 500.
