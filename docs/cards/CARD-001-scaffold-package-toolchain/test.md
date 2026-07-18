---
verdict: pass
---
# CARD-001 — Test (re-run after review-panel rework)

## Suite
`npm test` (Vitest, clean tree after fresh `npm ci`) → **12 tests pass, exit 0**
```
Test Files  2 passed (2)
     Tests  12 passed (12)
✓ src/server/paths.test.ts (5 tests)
✓ test/packaging.test.ts (7 tests)
  ✓ ships no test files in the published tarball
```
The rework's new tarball assertion runs a real `npm run build` then `npm pack --dry-run --json`,
parses the file listing, and asserts none match `/\.test\./`. Passes.

## Coverage
`npm run test:coverage` → **100% lines/functions/branches/statements on `paths.ts`** (≥90% target).
```
All files |     100 |      100 |      100 |     100 |
 paths.ts |     100 |      100 |      100 |     100 |
```

## Lint & types
- `npm run lint` → exit 0 (no issues).
- `npm run typecheck` (`tsc -b --noEmit`) → exit 0; walks all projects. The rework's tsconfig changes
  (server excludes `**/*.test.ts`; test project re-includes `src/server/**/*.test.ts`) keep test files
  type-checked without emitting them.

## Build, CLI, tarball
- `npm run build` → exit 0. `dist/ui/index.html` + hashed JS/CSS; `dist/server/index.js` shebang first
  line. `dist/server/` holds exactly 4 files: `index.{js,d.ts}`, `paths.{js,d.ts}` — **no test files**.
- `node dist/server/index.js` → `usage: kanban-flow-viewer <path-to-repo>`, exit **64**.
- `npm pack --dry-run` → **8 files, 62.4 kB, none matching `*.test.*`** (`| grep '\.test\.'` → no
  matches). `find dist/server -type f` → the 4 production files only.

## Rework verification (both blocking findings confirmed fixed)
- **#1 Node globals in UI:** `tsconfig.app.json` pins `types: ["vite/client"]`. Probe `process.cwd()`
  in `src/ui` → `npm run typecheck` exit 1 (TS2591). Reverted, clean exit 0.
- **#2 test files shipped:** `tsconfig.server.json` excludes `**/*.test.ts`; `tsconfig.test.json`
  re-includes `src/server/**/*.test.ts`. Clean build + `npm pack --dry-run` → 8 files, zero `*.test.*`.
  Typecheck-coverage proof: type error injected into `paths.test.ts` → typecheck red via the test
  project; reverted.

## Dependencies
`rm -rf node_modules dist coverage && npm ci` → exit 0 (307 packages, 0 vulnerabilities).
