# Implement — CARD-019: Parse card.md frontmatter and body into the card model

## What changed
- Added `src/server/card-model.ts`: `CardModel`, `ReworkCounts`, `CriteriaCount` interfaces, exactly per design.md's Interfaces section.
- Added `src/server/parse-card.ts`: pure `parseCard(raw, options)` (no fs/network imports — AC-4 by construction), the explicit snake_case→camelCase field map with per-field coercion helpers (`asString`, `asStringArray`, `asNonNegInt`, `asNumberOrNull`, `asOptionalNonEmptyString`, `asDateString`, `asReworks`), plus `extractSection(content, heading)` and `countCriteria(sectionText)`.
- Added `src/server/parse-card.test.ts`: 18 tests covering the full frontmatter map (AC-1), typed defaults/never-throws (AC-5), partial reworks, blank-string line counts, blocker present/absent/empty, unrecognized-status passthrough (REQ-027/033), unquoted-date coercion (the Date gotcha), Why/Notes extraction (AC-3), `extractSection` unit behaviour (absent heading, `###` sub-heading non-termination), acceptance-criteria heading-scoping (AC-2, proven non-vacuously — see below), and a seeded/bounded fast-check property for `countCriteria`.
- `package.json`: added `gray-matter` to `dependencies` (project's first runtime dependency, ADR-0005) and `fast-check` to `devDependencies`.
- `tsconfig.test.json`: registered `src/server/card-model.ts` and `src/server/parse-card.ts` in `include` (composite-project TS6307 precedent from `paths.ts`).
- `test/packaging.test.ts`: updated the CARD-001 contract test that literally pinned ADR-0002's "zero runtime dependencies" consequence — ADR-0005 explicitly amends that consequence, so the assertion now checks `dependencies` is exactly `['gray-matter']`.
- Refactored `extractSection`'s loop from an indexed `for` (which needed a `?? ''` fallback under `noUncheckedIndexedAccess`, an unreachable branch) to `for (const line of lines.slice(startIndex + 1))`, reaching 100% branch coverage without testing dead code.

## Deviations from design
1. **Skipped `@types/gray-matter`** (named in card.md/dispatch as a devDependency to add). It does not exist on the npm registry — `npm view @types/gray-matter version` returns 404. It is also unnecessary: `gray-matter`'s own `package.json` declares `"typings": "gray-matter.d.ts"`, and those bundled types resolve correctly under this project's `NodeNext`/`verbatimModuleSyntax` config (`import matter from 'gray-matter'` via `esModuleInterop` + the type file's `export = matter`). `npx tsc -b --noEmit` is green with no `@types/gray-matter` present. Recorded as a repo Gotcha so no future design proposes it again.
2. **Amended `test/packaging.test.ts`** (outside design.md's listed in-scope files). Adding `gray-matter` to `dependencies` (task 1, explicitly in scope) makes CARD-001's existing contract test — which pins ADR-0002's original "npx installs zero runtime dependencies" consequence verbatim — fail. ADR-0005 (already Accepted, binding) explicitly amends that exact consequence, so I updated the one assertion (`is an ESM package with no runtime dependencies` → asserting `dependencies` deep-equals `['gray-matter']`) rather than leaving a red gate. This is a one-line, ADR-sanctioned consequence of an in-scope change, not new scope.
3. **Size is over the stated budget**: the branch diff (excluding `package-lock.json` and `docs/cards/**`) is ~541 changed lines against a 500-line `size_limit` (design's own estimate was 300). The overage (~8%) is driven almost entirely by `parse-card.test.ts` (355 lines), which directly implements design.md's own Test strategy section — 8 explicit red→green cycles each with a dedicated inline fixture plus the dispatch's explicit instruction to make the AC-2 scoping proof non-vacuous with stray checkboxes in two other sections. I did not cut any test to fit the budget — trimming coverage to hit a line count would violate "never weaken a test to make it pass." Flagged for the checker/reviewer and the split sub-step rather than silently shipping under-tested code.

## Commits
- `8491690` chore(CARD-019): add gray-matter (dependency) and fast-check (devDependency)
- `6efeff7` feat(CARD-019): parse card.md frontmatter into the card model (happy path)
- `bef0f8d` feat(CARD-019): defaults, partial reworks, blank line counts, blocker, unknown status
- `51e235c` fix(CARD-019): coerce unquoted YAML dates to YYYY-MM-DD strings
- `00a3c88` feat(CARD-019): extract Why paragraph and Notes from the card body
- `5152488` feat(CARD-019): count acceptance-criteria checkboxes scoped to the heading
- `e96dd51` test(CARD-019): add a fast-check property for countCriteria
- `e15812c` test(CARD-019): reach 100% coverage; update ADR-0002's runtime-deps contract test

## Gate evidence
- `npm run lint` → `ESLint: No issues found`
- `npx tsc -b --noEmit` → `TypeScript: No errors found`
- `npm test` → 3 files, 30/30 tests passed
- `npm run test:coverage` → `parse-card.ts` and `paths.ts` both 100% stmts/branch/funcs/lines (threshold 90%); `card-model.ts` is pure interfaces (0 runtime statements); aggregate 100/100/100/100 across `src/server/**/*.ts` minus `index.ts`.

## Mutation proofs (run live, then reverted, working tree left clean)
- **AC-2 heading scoping**: with `criteria: countCriteria(extractSection(content, 'Acceptance criteria'))` reverted to `criteria: countCriteria(content)` (no heading scoping), the scoping test's assertion failed with exactly `{ done: 4, total: 7 }` against the fixture's designed `{ done: 2, total: 5 }` — confirming the heading boundary, not just the checkbox regex, does the work.
- **fast-check property**: with `countCriteria`'s `total` mutated to `done + notDone + 1`, `fc.assert` failed after 1 run, shrinking the counterexample to `[]` (the empty line array) — confirming the property's invariants have teeth, not just passing vacuously.
