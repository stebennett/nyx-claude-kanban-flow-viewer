# Split — CARD-019: Parse card.md frontmatter and body into the card model

## Verdict
**Refused.** No whole-file carve keeps every slice green and under `size_limit` (500 changed lines).
The branch's dominant pair — `src/server/parse-card.ts` (127) and `src/server/parse-card.test.ts`
(415) — sums to 542 lines on its own, already over the cap, and the two cannot be separated: the
coverage gate (`coverage_target`: 90% on the core-logic layer) forces them to ship together. Splitting
file *content* to fit is forbidden (an unreviewed rewrite of lens-panel-approved code). The card ships
as **one oversized PR** (601 changed lines, excl. lock file and `docs/cards/**`). `split_slices: 0`.

## Environment
Bootstrapped a throwaway worktree off `origin/main`, applied the WHOLE original change, then:
`npm ci` (0 vuln), `npm run lint` (clean), `npm run typecheck` (clean), `npm run build` (clean),
`npm test` (34/34), `npm run test:coverage` (100/100/100/100 across `src/server/**/*.ts` minus
`index.ts`). The environment is sound — every red below is a real statement about the code.

## Coupling analysis (why no carve exists)
Ground truth (measured, `--no-renames`): 6 non-excluded changed paths, 601 lines.

| path | type | lines |
|---|---|---|
| `package.json` | M | 7 |
| `src/server/card-model.ts` | A | 39 |
| `src/server/parse-card.test.ts` | A | 415 |
| `src/server/parse-card.ts` | A | 127 |
| `test/packaging.test.ts` | M | 4 |
| `tsconfig.test.json` | M | 9 |

**Test 1 — `package.json` split from `test/packaging.test.ts`.** Applied the gray-matter dep but
reverted `packaging.test.ts` to `origin/main`. `npm test` → **RED**: `is an ESM package with no
runtime dependencies` fails (`expected false to be true`). The dep and its matching assertion must
ship in the same slice.

**Test 2 — `parse-card.ts`/`card-model.ts` split from `parse-card.test.ts`.** Kept source + deps +
tsconfig, withheld `parse-card.test.ts`. lint/typecheck/build/test pass, but `npm run test:coverage`
→ **RED**: aggregate 7.21% (`parse-card.ts` 0%, lines 1-127 uncovered) vs the 90% threshold. The
source cannot ship without its test.

**Arithmetic that closes the door.** Best case — `card-model.ts` alone (39, pure interfaces, 0
executable statements) + `package.json`+`packaging.test.ts` together (11, green) — leaves the
irreducible slice `parse-card.ts` (127) + `parse-card.test.ts` (415) + tsconfig entries (≈7) = **549
lines**, still over 500. The 127+415=542 pair alone busts the cap before any overhead. No whole-file
boundary reduces it; splitting a file's content is a forbidden rewrite of reviewed code.

## Order / Coverage
N/A — refused, no slices. The original change set ships as one PR.
