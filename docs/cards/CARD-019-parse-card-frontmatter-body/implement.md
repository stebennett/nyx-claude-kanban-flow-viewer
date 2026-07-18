# Implement — CARD-019: Parse card.md frontmatter and body into the card model

## What changed
- Added `src/server/card-model.ts`: `CardModel`, `ReworkCounts`, `CriteriaCount` interfaces, per design.md's Interfaces section.
- Added `src/server/parse-card.ts`: pure `parseCard(raw, options)` (no fs/network — AC-4 by construction), the explicit snake_case→camelCase field map with per-field coercion helpers (`asString`, `asStringArray`, `asNonNegInt`, `asNumberOrNull`, `asOptionalNonEmptyString`, `asDateString`, `asReworks`), plus `extractSection(content, heading)` and `countCriteria(sectionText)`.
- Added `src/server/parse-card.test.ts`: covers the full frontmatter map (AC-1, incl. date fields), typed defaults/never-throws (AC-5), partial reworks, blank-string line counts, blocker present/absent/empty, unrecognized-status passthrough (REQ-027/033), unquoted-date coercion, Why/Notes extraction (AC-3), `extractSection` unit behaviour, acceptance-criteria heading-scoping (AC-2, non-vacuous), a seeded/bounded fast-check property for `countCriteria`, and pinned coercion-helper edge cases (see Rework).
- `package.json`: `gray-matter` → `dependencies` (project's first runtime dep, ADR-0005); `fast-check` → `devDependencies`.
- `tsconfig.test.json`: registered `card-model.ts` and `parse-card.ts` in `include` (composite-project TS6307).
- `test/packaging.test.ts`: updated the CARD-001 zero-runtime-deps assertion to `['gray-matter']` (ADR-0005 amends ADR-0002).
- `extractSection` uses `for (const line of lines.slice(startIndex + 1))` (avoids the `noUncheckedIndexedAccess` dead branch).

## Deviations from design
1. **Skipped `@types/gray-matter`** — doesn't exist on npm (404) and unnecessary (gray-matter ships its own `typings`); `tsc -b --noEmit` green without it.
2. **Amended `test/packaging.test.ts`** — ADR-0005 amends ADR-0002's zero-runtime-deps consequence, so the one assertion was updated rather than left red.
3. **Over the 500-line budget**: the branch diff (excl. `package-lock.json`, `docs/cards/**`) is 6 files / ~596 insertions, driven by `parse-card.test.ts` (~415 lines) implementing design.md's exhaustive Test strategy plus this rework's assertions. No test was cut to fit — the split sub-step decides delivery (the parser + its tests are one atomic unit; the phase-doc scan already split to CARD-020).

## Rework (review panel — tests lens)
Addressed the one BLOCKING finding plus its advisory follow-ons; nothing else touched (other lenses'
advisories — field grouping, `notDone`→`unchecked`, extractSection regex-escaping, fixture-builder — were
out of this rework's scope and ride the PR as-is).

- **BLOCKING — unasserted `asDateString` string-passthrough branch.** The full-fields fixture set quoted
  dates (`created: "2026-07-01"`, `started: "2026-07-02"`, `delivered: "2026-07-03"`) — the only fixture
  exercising `asDateString`'s `if (typeof value === 'string') return value;` branch — but never asserted
  `model.created`/`started`/`delivered`. Added the three assertions.
  **Mutation proof (live, reverted):** `parse-card.ts:36` `return value;` → `return '';`,
  `npx vitest run src/server/parse-card.test.ts` → full-fields test failed
  `AssertionError: expected '' to be '2026-07-01'` (17 pass / 1 fail). Reverted → all green.
- **Advisory (folded in) — coercion-helper edge cases, all pin current behaviour, no bug found:**
  - `asNonNegInt` rejects negative `reworks.slice: -1` → that producer defaults to 0.
  - `asNonNegInt` rejects wrong-typed `split_slices: "two"` → `splitSlices` defaults to 0.
  - `asNumberOrNull` passes negative `estimated_lines: -50` through unchanged (no clamping — documented,
    not a bug per REQ-020's line-count fields).
  - `asStringArray` drops non-string `123` from `depends_on: [CARD-001, 123]` → `dependsOn: ['CARD-001']`.

## Commits
- `8491690` chore: add gray-matter (dependency) + fast-check (devDependency)
- `6efeff7` feat: parse card.md frontmatter into the card model (happy path)
- `bef0f8d` feat: defaults, partial reworks, blank line counts, blocker, unknown status
- `51e235c` fix: coerce unquoted YAML dates to YYYY-MM-DD strings
- `00a3c88` feat: extract Why paragraph and Notes from the card body
- `5152488` feat: count acceptance-criteria checkboxes scoped to the heading
- `e96dd51` test: add a fast-check property for countCriteria
- `e15812c` test: reach 100% coverage; update ADR-0002's runtime-deps contract test
- `4544f70` test: assert quoted-date passthrough; pin coercion-helper edge cases (rework)

## Gate evidence (post-rework, clean tree)
- `npm ci` → 319 packages, 0 vulnerabilities
- `npm run lint` → ESLint: No issues found
- `npm run typecheck` (`tsc -b --noEmit`) → clean
- `npm test` → 3 files, **34/34** passed
- `npm run build` → vite + tsc both green
- `npm run test:coverage` → `parse-card.ts` + `paths.ts` 100% stmts/branch/funcs/lines; aggregate
  100/100/100/100 across `src/server/**/*.ts` minus `index.ts`
