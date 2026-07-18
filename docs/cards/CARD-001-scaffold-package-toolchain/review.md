---
verdict: fail
review_lenses_failed: [design, typescript]
---

# CARD-001 — Review panel (full run, 8 lenses)

Two lenses carry blocking findings (design, typescript); six are clean with advisories.
Both blocking findings were empirically confirmed against the compiler / `npm pack`, not
asserted. Verdict: **fail** → rework to card-implementer.

## [acceptance]

### Blocking
None.

### Advisory
- `src/server/index.ts:8` — `void uiDistDir(import.meta.url)` exists solely to keep the
  path function reachable from the built bin. `paths.ts` is already exercised by two test
  files and imported by `test/packaging.test.ts`, so the reachability rationale does not
  hold today, and CARD-005 replaces this body. Harmless placeholder; the comment's stated
  reason is moot.
- AC-1, AC-2 and AC-4 are gate criteria whose falsification proof (the mutation runs) lives
  in `implement.md`, not in the automated Vitest suite — inherent to lint/typecheck/build
  gates. Their standing enforcement lands with CARD-002 (CI). Noted so a future reader does
  not mistake the absence of a suite test for missing coverage.

### Checked clean (traceability confirmed)
- AC-1 → `eslint.config.js` applies recommended configs globally (both halves covered);
  mutation exit-1 proof recorded. AC-2 → `tsc -b --noEmit` walks all 4 references incl.
  `vite.config.ts`; 3-file mutation exit-2 proof + false-green record. AC-3 → `paths.test.ts`
  + `packaging.test.ts`, hand-computed expecteds, `ui2`/percent-decode mutations go red,
  100% coverage on `paths.ts`. AC-4 → build artifacts + shebang in `test.md`;
  `packaging.test.ts` seam pins bin↔tsc outDir↔Vite outDir↔`uiDistDir`. AC-5 → `bin`/`files`
  asserted + `npm pack` listing; delete-`bin`/drop-`dist` mutations go red.
- Scope: only `tsconfig.test.json` exceeds the design sketch, documented as deviation #4.
- All 6 deviations in `implement.md` justified in writing.

## [design]

### Blocking
- `tsconfig.server.json:13` — the emitting server project globs `src/server/**/*.ts`
  with no test exclude, so `src/server/paths.test.ts` is compiled and **emitted** to
  `dist/server`. Verified: `dist/server/paths.test.js` + `paths.test.d.ts` exist and
  `npm pack --dry-run` lists both (10 files) → the compiled unit test ships to every
  `npx` user. This is a defect in the one durable contract this card owns (ADR-0003's
  dist layout), and it compounds: every co-located `*.test.ts` CARD-004+ add will
  accrete into the published tarball, silently bloating the npx cold-start artifact the
  KNOWLEDGE gotcha guards. Deviation 4 fixed `test/**/*.ts` but not `src/server/*.test.ts`.
  **Fix (a pair, so typecheck stays honest):** add `"exclude": ["**/*.test.ts"]` to
  `tsconfig.server.json`, and broaden `tsconfig.test.json` include (line 11) to
  `src/server/**/*.test.ts` so `paths.test.ts` keeps coverage under the noEmit project.
  Then add a file-set assertion to `test/packaging.test.ts` (tarball contains no
  `dist/**/*.test.*`) — the packaging test's whole job is pinning the artifact, and this
  hole is exactly what it should close.

### Advisory
- `tsconfig.test.json:11` / `tsconfig.node.json:11` — the self-contained test leaf
  enumerates individual source files (`src/server/paths.ts`, `vite.config.ts`) and
  overlaps `vite.config.ts` with the node project, so that file is typechecked twice
  under two different `moduleResolution` settings (`bundler` vs `NodeNext`). Tolerated
  and green today, but CARD-004's author must hand-add each newly tested source file here
  or lose its typecheck-as-root. Broadening the include to `src/server/**/*.test.ts` (the
  blocking fix) also removes this per-file maintenance.
- Deviation 5 (`--force` on `build:server`) and deviation 4 (4th tsconfig project) both
  honour the design's intent. No design objection to either.

### Checked clean
- Layer boundaries hold at the import level: `src/server` imports only stdlib + `./paths.js`;
  `src/ui` imports no server code; `uiDistDir` is pure.
- `uiDistDir` is shaped for CARD-005; the packaging test pins bin ↔ tsc outDir ↔ vite outDir
  ↔ uiDistDir so the sibling layout cannot drift.
- ESLint flat config covers both halves; coverage include/exclude matches core-logic-layer intent.

## [functionality]

### Blocking
None.

### Advisory
- `src/server/paths.ts:13` — `uiDistDir` resolves relative to the caller's own directory,
  so a caller **not** directly in `dist/server` gets a silently-wrong path with no error: a
  future `dist/server/http/serve.js` calling `uiDistDir(import.meta.url)` would resolve to
  `dist/server/ui` (nonexistent) and break REQ-015's static serving. The JSDoc precondition
  and `paths.test.ts:10` already document and pin this behaviour, so it is intentional and
  out of this card's scope. Optional hardening for CARD-005: assert the parent dir is named
  `server`, or take the package root explicitly, so a nested caller fails loudly.

### Checked and clean
- Traced `dist/server → dist/ui` by hand; percent-decoding and non-file rejection delegated
  to `fileURLToPath` (both `TypeError`), matching JSDoc and the two negative tests — the throw
  originates in Node, not an unguarded assumption.
- `index.ts` placeholder: stderr usage line + `process.exitCode = 64`, matching REQ-010.
- Build/gate flow: `emptyOutDir` touches only `dist/ui`; `build:ui` precedes `build:server`;
  coverage scopes `src/server/**` minus `index.ts`.

## [security]

### Blocking
None. This is a toolchain scaffold with no runtime code, network service, DB, or outbound
calls — the only trust boundaries present are the supply-chain and release surface, and both
are sound.

### Advisory
- `tsconfig.server.json:13` — `"include": ["src/server/**/*.ts"]` (no `exclude`) matches
  `src/server/paths.test.ts`, so `build:server` emits `dist/server/paths.test.js` and
  `paths.test.d.ts`. `npm pack --dry-run` confirms both land in the published tarball. The
  package CARD-003 will publish carries compiled test code — unnecessary shipped surface; no
  secret leaks, and AC-5 only requires the two named files be *present*, so not a spec
  violation. Fix: `"exclude": ["**/*.test.ts"]` on `tsconfig.server.json`. (The design and
  typescript lenses escalate this same root cause to blocking — it is being reworked.)

### Checked clean
- Lockfile: 307/307 entries `resolved` from `registry.npmjs.org` with `integrity`; no
  git/http/file/link deps; no `.npmrc`.
- No `pre/post-install`, `prepare`, `prepublish`, or `prepack` lifecycle scripts.
- `dependencies: {}` — no runtime supply-chain surface reaches consumers.
- Tarball ships only `dist/**` + `package.json`; no source, docs, `.env`, dotfiles, `.map`
  files, or absolute dev paths.
- `bin` shebang `#!/usr/bin/env node` correct; `index.ts` has no injection surface; `uiDistDir`
  is pure over `import.meta.url`, not attacker-controlled.

## [simplicity]

### Blocking
None.

### Advisory
- `test/packaging.test.ts:297,310` — both `it` blocks independently `await import('../vite.config.js')`
  with the same inline cast. Hoisting to a single top-level `const viteConfig` (top-level await is
  valid in this ESM test file) would remove the duplicated cast. Low value — a nit, not rework.

### Checked and clean
- Diff-size audit: every changed file traces to `design.md`'s file list except the documented
  `tsconfig.test.json`.
- Verified in the worktree (not assumed) that `tsconfig.test.json`'s apparently-redundant inclusion
  of `src/server/paths.ts` and `vite.config.ts` is required: stripping them reproduces `TS6307`
  ("Projects must list all files or use an 'include' pattern"). Composite project references require
  every reachable file explicitly listed. The 4th project is warranted, not over-engineering.
- `readJson` helper is small, reused, no existing equivalent — not a reinvention.
- No speculative interface/registry/config surface beyond what AC-1..AC-5 and the ADRs justify.

## [tests]

### Blocking
None.

### Advisory
- `test/packaging.test.ts:36-41` — `toHaveProperty('lint'|'typecheck'|'test'|'build')` pins key
  presence only, not the command string. ADR-0003 names the exact regression this card exists to
  prevent: `typecheck` reverting from `tsc -b --noEmit` to plain `tsc --noEmit` (a false green that
  checks zero files). That exact revert would pass this test unchanged — only a future manual
  mutation re-run would catch it. Fix: `expect(pkg.scripts?.typecheck).toBe('tsc -b --noEmit')`
  (and optionally `lint`). Design's Test strategy scoped this test to "has keys" only, so this is a
  residual gap in the chosen scope. **[folded into the rework — same file as the design blocker.]**
- `src/server/paths.test.ts:26-31` — self-location test uses `.endsWith('/dist/ui')` /
  `!.includes('/server/')` rather than an exact literal. Verified non-vacuous (a hardcoded-constant
  mutant fails the other four literal tests), but the weakest assertion in an otherwise tightly
  literal-pinned file.

### Checked
- Hand-traced every expected value in `paths.test.ts` — none restate `path.resolve`; the seam
  assertion derives both sides independently (a genuine drift guard, not vacuous). AC-3/4/5 have
  durable automated coverage; AC-1/2 proven by one-time manual mutation per design's strategy.
- Notable good: the percent-encoding case and the seam test are genuinely discriminating — built to
  catch a specific plausible-wrong implementation, not restate the correct one.

## [readability]

### Blocking
None.

### Advisory
- `src/server/paths.ts:4-8` — the JSDoc states the working example ("Given dist/server/index.js,
  returns dist/ui") but never says the module must be **directly** in `dist/server`; only
  `paths.test.ts`'s inline comment carries that precondition. A reader trusting the JSDoc alone could
  call it from a nested module and get a silently wrong path. `design.md`'s Test-strategy section
  names this exact honesty requirement, but the shipped JSDoc is the design's earlier Interfaces
  sketch, copied verbatim. Fix: add a one-line precondition sentence to the JSDoc.
- `tsconfig.test.json:12` — `include` lists `src/server/paths.ts` and `vite.config.ts` directly,
  duplicating ownership already held by other projects, with no `references` edge and no in-repo
  comment (the TS6310-avoidance reasoning lives only in `implement.md`). This file isn't `JSON.parse`d
  by any test, so a `//` comment here is free and would carry the "why" forward.
- `CLAUDE.md:5-11` — untouched by this diff, still reads "Pre-implementation... there is no code,
  package.json, or build/test tooling yet" and instructs the next implementer to update it "when
  implementation lands." This card is that landing; the Project-state and Workflow sections are now
  stale. (Note: CLAUDE.md is edit-protected by a hook — flagged to the driver separately.)

### Checked and clean
- `src/ui/App.tsx`, `src/ui/main.tsx`, `index.html`, `eslint.config.js`, the tsconfig family each
  legible standalone; the `.js`-extension convention consistent across all relative imports. The
  `void uiDistDir` comment explains *why* an apparently-dead call exists — the right kind of comment.

## [typescript]

### Blocking
- `tsconfig.app.json:1` — no `types` array is set, so TypeScript's default behaviour auto-includes
  every package under `node_modules/@types`, including `@types/node`. Verified live: added
  `process.cwd()` to `src/ui/App.tsx`, ran `npx tsc -p tsconfig.app.json --noEmit` — exit 0, zero
  diagnostics. Node's ambient globals type-check inside `src/ui` with no error. This falsifies
  design.md's Interfaces section ("`src/ui` may never import from `src/server`... The two tsconfigs
  enforce this by construction — this is the primary reason for the split") and ADR-0002's stated
  consequence. The other three leaf configs correctly pin `types: ["node"]`; `tsconfig.app.json` is
  missing the equivalent restriction. Fix: pin `types: ["vite/client"]` (or `[]`).
- `tsconfig.server.json:13` — `include: ["src/server/**/*.ts"]` has no test exclusion, so it matches
  the co-located `src/server/paths.test.ts`. Verified live: clean `npm run build`, then `ls dist/server`
  shows `paths.test.js` + `paths.test.d.ts`, and `npm pack --dry-run` lists `dist/server/paths.test.js`
  (1.5kB) in the tarball. The emitted file imports `from 'vitest'` (a devDependency, absent from
  `dependencies`) — dead test code ships inside the published REQ-007 artifact. Fix: add
  `"exclude": ["src/server/**/*.test.ts"]` (or `["**/*.test.ts"]`) to `tsconfig.server.json`; the new
  `tsconfig.test.json` already covers `paths.test.ts` for typechecking (broaden its include to keep it).

### Advisory
- `test/packaging.test.ts:12-17,60-71` — the `readJson`/`viteConfigModule` casts (`as {...}`) discard
  the real inferred shapes. A `satisfies`-based narrowing or importing the real `UserConfig` types
  would keep the compiler checking the packaging test's own correctness. Low risk.

### Checked and clean
- strict-flag family (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`,
  `skipLibCheck`); every relative import carries the ADR-0001 `.js` extension under its project's
  resolution mode; no `any`, bare `as T`, or `!` assertion anywhere in the diff; `App.tsx`'s
  `React.JSX.Element` and `uiDistDir`'s signature both compile and match tested behaviour; re-ran
  `tsc -b --noEmit` from clean `dist` — genuinely exits 0 checking real files (confirms ADR-0003).
