# CARD-001 — Implement: Scaffold the TypeScript package and toolchain

## What changed (original implementation, summarized)
`package.json` (ESM, `bin`/`files`, 4 gate scripts + `package-lock.json`); 5-project TypeScript
layout (`base`/`server`/`app`/`node`/`test`, solution-root references); `src/server/paths.ts`
(`uiDistDir`, pure, 100% covered) + `paths.test.ts`; `src/server/index.ts` (placeholder CLI entry);
`src/ui/*` placeholder entry points; `vite.config.ts` (build + Vitest block); `test/packaging.test.ts`
(pins bin/files/scripts/outDir/uiDistDir); `eslint.config.js` (flat config, both halves).

## Deviations from design (original implementation)
1. Task 2's mutation verification deferred to after task 6, per dispatch correction.
2. `App.tsx` uses `React.JSX.Element` (design's `JSX.Element` sketch fails under @types/react 19).
3. `lint` script key added in task 4, not task 7 as literally sequenced.
4. `tsconfig.test.json` added as a 4th, self-contained project — required once `test/**/*.ts` inside
   `tsconfig.server.json`'s include broke `dist/server/index.js`'s flat rootDir (TS6310 avoided).
5. `build:server` runs `tsc -b tsconfig.server.json --force` — `tsc -b` silently no-ops on a stale
   `.tsbuildinfo` after `rm -rf dist`.
6. AC-2's `-p`-per-project fallback was not needed; pinned TypeScript 5.9.3 accepts `-b --noEmit` fine.

## Rework
Addressed both BLOCKING findings from `review.md` (design lens, typescript lens) plus the required
test hardening folded into the same dispatch. No advisory findings were touched.

### Blocking finding 1 — Node globals leaked into `src/ui` (typescript lens)
`tsconfig.app.json` had no `types` array, so TypeScript auto-included every `@types/*` package
including `@types/node`, falsifying the server/UI boundary ADR-0002 and design.md claim.
- **Fix:** pinned `"types": ["vite/client"]` in `tsconfig.app.json`'s `compilerOptions`.
- **Before:** probe `process.cwd()` added to `src/ui/App.tsx` → `npm run typecheck` exit **0** (leak
  confirmed live).
- **After:** same probe, same command → exit **1**, `TS2591: Cannot find name 'process'`. Probe
  reverted; clean `npm run typecheck` → exit 0.

### Blocking finding 2 — compiled test files shipped in the published tarball (design + typescript + security lenses)
`tsconfig.server.json`'s `include: ["src/server/**/*.ts"]` had no test exclude, so
`src/server/paths.test.ts` was compiled and emitted to `dist/server`, then packed into the tarball.
- **Fix (pair):** (a) added `"exclude": ["**/*.test.ts"]` to `tsconfig.server.json`; (b) broadened
  `tsconfig.test.json`'s `include` to add `"src/server/**/*.test.ts"` so `paths.test.ts` keeps
  typecheck coverage under the noEmit project now that the server project no longer sees it.
- **Before:** clean `npm run build` → `dist/server` held `paths.test.js` + `paths.test.d.ts`;
  `npm pack --dry-run` listed both (10 files total, 62.9 kB).
- **After:** clean `npm run build` → `dist/server` holds exactly 4 files (`index.{js,d.ts}`,
  `paths.{js,d.ts}`); `npm pack --dry-run` lists 8 files (62.4 kB), none matching `*.test.*`.
- **Typecheck-coverage proof:** injected `const n: number = 'x';` into `paths.test.ts` →
  `npm run typecheck` went red (`TS2322`) via `tsconfig.test.json`; reverted, clean.

### Required test hardening (`test/packaging.test.ts`)
1. **Literal gate-command assertions.** `declares the four gate scripts...` now asserts
   `pkg.scripts.lint === 'eslint .'` and `pkg.scripts.typecheck === 'tsc -b --noEmit'` (was key
   presence only). RED-verified: temporarily reverted `typecheck` to plain `tsc --noEmit` in
   `package.json` → assertion failed (`expected 'tsc --noEmit' to be 'tsc -b --noEmit'`); reverted.
2. **New tarball-set assertion.** `ships no test files in the published tarball` runs a real
   `npm run build` then `npm pack --dry-run --json`, parses the `files` array, asserts none match
   `/\.test\./`. RED-verified: with `tsconfig.server.json`'s `exclude` temporarily removed, the
   assertion failed listing `dist/server/paths.test.d.ts` / `paths.test.js`; restored, green.

Net rework diff: 3 commits, +27/-2 lines across `tsconfig.app.json`, `tsconfig.server.json`,
`tsconfig.test.json`, `test/packaging.test.ts`.

## Full gate re-run (clean tree, after both fixes + test hardening)
- `rm -rf node_modules dist coverage && npm ci` → exit 0 (307 packages, 0 vulnerabilities).
- `npm run lint` → exit 0.
- `npm run typecheck` (`tsc -b --noEmit`) → exit 0.
- `npm test` → **12/12** tests pass across 2 files (was 11 before rework — +1 tarball assertion).
- `npm run test:coverage` → 100% lines/functions/branches/statements on `paths.ts` (≥90% target).
- `npm run build` → `dist/ui/index.html` + hashed JS/CSS assets; `dist/server/index.js` first line is
  the shebang; `dist/server` contains exactly 4 files (no test files).
- `node dist/server/index.js` → prints the usage line to stderr, exit **64**.
- `npm pack --dry-run` → 8 files, `package size: 62.4 kB`; no `dist/**/*.test.*` entries.
- `git diff origin/main...HEAD --shortstat` (excluding `package-lock.json`, `docs/cards/**`): **19
  files changed, 372 insertions(+)** — under the 500-line `size_limit`.

## Commits
- `f307850` chore(scaffold): bootstrap package.json and lockfile
- `585e24f` chore(scaffold): add project-references tsconfigs and typecheck script
- `d951b14` feat(server): add uiDistDir path function with Vitest coverage gate
- `b95a9be` feat(pkg): declare bin, files and build scripts; pin the packaging contract
- `f3bca21` feat(server): add placeholder CLI entry point
- `60e8ed3` fix(tsconfig): split test-file typechecking into its own project
- `67f1389` feat(ui): add placeholder UI entry points and verify the build
- `9fcc3e4` feat(lint): add flat ESLint config covering both halves
- `b93cb43` fix(build): force tsc -b to rebuild past a stale .tsbuildinfo
- `d537390` fix(tsconfig): pin vite/client types on the UI project to exclude Node globals
- `b5a1751` fix(tsconfig): exclude test files from the emitting server project
- `c3707da` test(packaging): pin literal gate commands and assert no test files ship
