# CARD-001 — Implement: Scaffold the TypeScript package and toolchain

## What changed
- `package.json`: ESM (`type: module`), `engines.node >= 20`, empty `dependencies`, devDeps for
  TypeScript/ESLint/Vite/Vitest/React; `bin`, `files: ["dist"]`; scripts `lint`, `typecheck`, `test`,
  `test:coverage`, `build`, `build:ui`, `build:server`. Committed `package-lock.json`.
- TypeScript: `tsconfig.base.json` (strict, noUncheckedIndexedAccess, verbatimModuleSyntax, ...),
  `tsconfig.server.json` (NodeNext, `rootDir: src/server`, `outDir: dist/server`),
  `tsconfig.app.json` (bundler resolution, DOM libs, react-jsx), `tsconfig.node.json` (vite.config.ts),
  `tsconfig.test.json` (a 4th, self-contained project for `test/**/*.ts` — see Deviations),
  solution-root `tsconfig.json` (`files: []` + all 4 references).
- `src/server/paths.ts` — `uiDistDir(serverModuleUrl)`, pure, 100% covered; `src/server/paths.test.ts`
  (5 assertions, TDD RED→GREEN, mutation-checked). `src/server/index.ts` — placeholder CLI entry
  (shebang, REQ-010 usage line, exit 64).
- `src/ui/` — `main.tsx`, `App.tsx` (`React.JSX.Element` return type — see Deviations), `index.css`,
  `App.css`, `vite-env.d.ts`; root `index.html`.
- `vite.config.ts` — plain object export, `build.outDir: 'dist/ui'`, Vitest `test` block (node env,
  v8 coverage, 90% thresholds on `src/server/**/*.ts` excluding `index.ts`).
- `test/packaging.test.ts` — pins bin/files/scripts/outDir/uiDistDir to one another (6 assertions,
  TDD RED→GREEN, 3 mutations checked).
- `eslint.config.js` — flat config, `@eslint/js` + `typescript-eslint` recommended, react-hooks +
  react-refresh for `src/ui`, node globals for `src/server`/`test`/`*.config.*`.

## Deviations from design
1. **Task 2's mutation verification deferred to after task 6**, per dispatch correction — confirmed
   the predicted TS18003 at task-2 time, then ran the real 3-file mutation proof after task 6.
2. **`App.tsx` uses `React.JSX.Element`**, per dispatch correction (design's `JSX.Element` sketch
   fails under @types/react 19).
3. **`lint` script key added in task 4** (not task 7 as literally sequenced) — `test/packaging.test.ts`
   asserts `pkg.scripts` has a `lint` key, which the design's own task 4 would otherwise leave RED
   until task 7. `eslint.config.js` itself still lands in task 7; only the script string moved earlier.
4. **`tsconfig.test.json` added as a 4th project** (not in design's 3-project sketch) — a genuine
   gap surfaced once real files existed: `test/**/*.ts` inside `tsconfig.server.json`'s include broke
   `dist/server/index.js`'s flat path (rootDir became the common ancestor of `src/server` and `test`).
   Splitting test-typechecking into its own self-contained leaf project (no formal `references` edge,
   to dodge a `tsc -b --noEmit` + composite-references conflict — TS6310) fixes it without any product
   scope change. ADR-0003 itself anticipated "adding a fourth project... means one more reference" for
   a different reason (future jsdom project); this generalizes the same mechanism.
5. **`build:server` runs `tsc -b tsconfig.server.json --force`** (design said no flag) — found during
   task 8's end-to-end verification that `tsc -b` silently no-ops (exit 0, nothing emitted) when
   `dist/` is deleted but a stale `.tsbuildinfo` survives. `--force` closes this "gate that cannot
   fail" gap; `.tsbuildinfo` is gitignored so a fresh clone never hits it, but local `rm -rf dist` and
   CI build-state caching both can.
6. **AC-2's fallback was not needed** — pinned TypeScript 5.9.3 accepts `tsc -b --noEmit` fine at the
   solution root (the TS6310 issue above was caused by my own added cross-project reference, not by
   the pinned compiler rejecting `-b --noEmit`; removing that reference in favour of a self-contained
   leaf resolved it).

Net size: 350 changed lines (package-lock.json excluded), under the 500 limit.

## Gate evidence (final, pristine `git archive HEAD` export)
- `npm ci` → exit 0.
- `npm run lint` → exit 0. Mutations (unused var in `paths.ts`, then `App.tsx`) → exit 1 each, reverted.
- `npm run typecheck` (`tsc -b --noEmit`) → exit 0. Mutations (type error in `paths.ts`, `App.tsx`,
  `vite.config.ts`) → exit 2 each, reverted. Plain `tsc --noEmit` with the `vite.config.ts` error still
  present → exit 0 (the documented false green, ADR-0003).
- `npm test` → 11/11 assertions pass. `npm run test:coverage` → 100% lines/functions/branches/statements
  on `paths.ts` (≥90% threshold).
- `npm run build` → `dist/ui/index.html` + hashed JS/CSS assets; `dist/server/index.js` first line is
  the shebang; `node dist/server/index.js` prints the usage line, exits 64.
- `npm pack --dry-run` → tarball lists `dist/server/index.js` and `dist/ui/index.html` (10 files,
  62.9 kB); no `!dist` negation or `.npmignore` needed.

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
