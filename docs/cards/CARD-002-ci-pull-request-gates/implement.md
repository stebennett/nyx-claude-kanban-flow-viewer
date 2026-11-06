# CARD-002 — Implement

## What changed
- Added `js-yaml` + `@types/js-yaml` as devDependencies (package.json, package-lock.json).
- Added `test/ci-workflow.test.ts`: parses `.github/workflows/ci.yml` with js-yaml, asserts literal values —
  `on.pull_request.branches === ['main']`, `on.workflow_call` present, ordered step run-list
  (`npm ci` → `npm run lint` → `npm run typecheck` → `npm run build` → `npm test`), `tsc --noEmit` absent from
  every step, no `npm install`/`npm i`, `setup-node` `cache: npm` + node `20`, no `actions/cache` step and no
  `tsbuildinfo`/`path: dist` text in the file, `permissions.contents === 'read'`.
- Added `.github/workflows/ci.yml`: `on: [pull_request(branches: [main]), workflow_call]`, `permissions:
  contents: read`, `concurrency` (kept per design-check advisory), single `gates` job on `ubuntu-latest`:
  checkout → setup-node(node 20, cache npm) → npm ci → npm run lint → npm run typecheck → npm run build →
  npm test.
- Confirmed RED before creating ci.yml (ENOENT on the missing file), GREEN after, and 5/5 design-specified
  mutations (npm ci→npm install; drop workflow_call; typecheck→raw tsc --noEmit; add actions/cache for
  *.tsbuildinfo; branches [main]→[develop]) each independently confirmed RED then reverted.
- Task 2 (lint seed): `_seed` unused local in src/server/paths.ts → eslint exit 1
  (`@typescript-eslint/no-unused-vars`), `tsc -b --noEmit` exit 0. Reverted.
- Task 3 (typecheck seed): `export const seedTypeError: number = 'x'` → eslint exit 0, `tsc -b --noEmit` exit 1
  (TS2322). Reverted.
- Task 4 (test seed): `test/seed.test.ts` with `expect(2).toBe(3)` → eslint exit 0, tsc exit 0, vitest exit 1.
  Deleted.
- Task 5 (build seed, reframed): `index.html`'s `<script src>` → `/src/ui/missing.tsx`: `vite build` exits 1
  (`[vite:build-html] Failed to resolve /src/ui/missing.tsx`), lint/typecheck stay exit 0. Standalone
  `vitest run` ALSO fails under the same seed (`test/packaging.test.ts:77`'s `execFileSync('npm', ['run',
  'build'])` throws) — this is the reason build must precede test in CI, not a residual defect. With the
  new step order, a build-only breakage halts the job at the `build` step (test never reached), restoring
  AC-3's per-step attribution. Reverted.
- Reordered `.github/workflows/ci.yml`'s last two steps to `npm run build` then `npm test`; updated
  `test/ci-workflow.test.ts`'s ordering assertion to match. Mutation-verified: swapping the two steps back
  → test RED (`expected 4 to be less than 3`); reverted → GREEN.
- Final clean-tree sanity (new order): `npm ci && eslint . && tsc -b --noEmit && vite build && tsc -b
  tsconfig.server.json --force && vitest run` — all exit 0, 18/18 tests pass.

## Deviations from design
- **Reordered CI steps to build-before-test** (deviation from ADR-0004's stated order
  lint→typecheck→test→build and from design.md's step list). Rationale: `test/packaging.test.ts` (CARD-001,
  out of this card's scope) shells out to `npm run build`, so the test gate depends on the build gate; build
  must precede test for the job to fail at the correct step and for each gate to be independently
  falsifiable per AC-3. This was surfaced as a blocker during implementation (task 5's isolation proof failed
  with the design's original order), confirmed independently by the driver, and resolved by explicit driver
  instruction to reorder rather than modify CARD-001-owned test code. **ADR-0004's substance — one reusable
  workflow, no build-state caching, workflow_call reuse — is unchanged; only the step order within the single
  job differs from the ADR's Decision-section text.** The ADR's stated order is now stale on this one point;
  the deviation is recorded here and in KNOWLEDGE rather than silently diverging.

## Commits
- `dffb37a` feat(CARD-002): add CI reusable workflow with pull_request + workflow_call gates — ci.yml,
  ci-workflow.test.ts, js-yaml + @types/js-yaml devDependencies.
- `f548083` fix(CARD-002): reorder CI gates to build-before-test — ci.yml step order, ci-workflow.test.ts
  ordering assertion, mutation-verified.
