---
verdict: pass
---
# CARD-002 — Test

## Suite
Clean tree (`rm -rf node_modules dist coverage`), then:
- `npm ci` → exit 0 (308 packages, 0 vulnerabilities)
- `npm run lint` → exit 0 (ESLint: No issues found)
- `npm run typecheck` (`tsc -b --noEmit`) → exit 0
- `npm run build` → exit 0 (dist/ui + dist/server) — runs BEFORE test per the reorder
- `npm test` → exit 0, **18/18**:
  ```
  ✓ src/server/paths.test.ts (5 tests)
  ✓ test/ci-workflow.test.ts (6 tests)
  ✓ test/packaging.test.ts (7 tests)
  Test Files  3 passed (3)   Tests  18 passed (18)
  ```

## Coverage
`npm run test:coverage` → **100%** stmts/branch/funcs/lines on `paths.ts` (target 90%). Only measured
source is `paths.ts` (CARD-001 core logic); CI files (`ci-workflow.test.ts`, `.github/workflows/ci.yml`)
are not measured source — CARD-002 adds no `src/server` logic.

## CI contract verification
`.github/workflows/ci.yml` checked against `test/ci-workflow.test.ts`:
- `on.pull_request.branches === ['main']` ✓; `workflow_call` present ✓ (AC-1)
- step order `npm ci → npm run lint → npm run typecheck → npm run build → npm test` ✓ — **build before
  test** (test/packaging.test.ts depends on the build) (AC-2)
- `npm ci` (not `npm install`) ✓; setup-node `cache: npm`, node 20 ✓; NO `actions/cache`, no
  `tsbuildinfo`/`dist` cache path ✓ (AC-4)
- typecheck step is `npm run typecheck`, never raw `tsc --noEmit` ✓ (ADR-0003)
- `permissions.contents: read` ✓

All gates green; the CI contract holds.
