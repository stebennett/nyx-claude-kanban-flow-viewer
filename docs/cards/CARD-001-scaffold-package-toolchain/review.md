---
verdict: pass
review_lenses_failed: [design, typescript]
---

# CARD-001 — Review panel (partial — design & typescript pending re-review)

The first full run stamped **fail**: the design and typescript lenses each carried a blocking
finding (test files shipped in the tarball; Node globals leaking into the UI project). Both were
reworked by card-implementer (commits d537390, b5a1751, c3707da) with RED/GREEN evidence. Those two
lens sections have been stripped here and are queued to re-review the reworked code; the six sections
below passed on the full run and stand. The absent sections — not this verdict — mark the panel
incomplete.

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
- `tsconfig.server.json:13` — (raised advisory here; the design and typescript lenses escalated
  this same root cause — compiled test files shipping in the tarball — to blocking, and it has
  now been fixed via `exclude: ["**/*.test.ts"]`.)

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
- `test/packaging.test.ts` — two `it` blocks independently `await import('../vite.config.js')`
  with the same inline cast. Hoisting to a single top-level `const viteConfig` would remove the
  duplicated cast. Low value — a nit, not rework.

### Checked and clean
- Diff-size audit: every changed file traces to `design.md`'s file list except the documented
  `tsconfig.test.json`.
- Verified in the worktree (not assumed) that `tsconfig.test.json`'s apparently-redundant inclusion
  of `src/server/paths.ts` and `vite.config.ts` is required: stripping them reproduces `TS6307`
  ("Projects must list all files or use an 'include' pattern"). The 4th project is warranted.
- `readJson` helper is small, reused, no existing equivalent — not a reinvention.
- No speculative interface/registry/config surface beyond what AC-1..AC-5 and the ADRs justify.

## [tests]

### Blocking
None.

### Advisory
- `test/packaging.test.ts` gate-scripts test pinned key presence only, not the command string —
  ADR-0003's exact false-green regression (`typecheck` reverting to plain `tsc --noEmit`) would
  pass unchanged. **Fixed in the rework** (commit c3707da): the test now asserts the literal
  command strings, RED-verified against the regression.
- `src/server/paths.test.ts:26-31` — self-location test uses `.endsWith('/dist/ui')` /
  `!.includes('/server/')` rather than an exact literal. Verified non-vacuous, but the weakest
  assertion in an otherwise tightly literal-pinned file.

### Checked
- Hand-traced every expected value in `paths.test.ts` — none restate `path.resolve`; the seam
  assertion derives both sides independently (a genuine drift guard). AC-3/4/5 have durable
  automated coverage; AC-1/2 proven by one-time manual mutation per design's strategy.
- Notable good: the percent-encoding case and the seam test are genuinely discriminating.

## [readability]

### Blocking
None.

### Advisory
- `src/server/paths.ts:4-8` — the JSDoc states the working example but never says the module must be
  **directly** in `dist/server`; only `paths.test.ts`'s inline comment carries that precondition.
  Fix: add a one-line precondition sentence to the JSDoc. (Advisory — not addressed in this rework.)
- `tsconfig.test.json` — `include` lists source files with no in-repo comment explaining the
  TS6310-avoidance (reasoning lives only in `implement.md`). A `//` comment here would carry the
  "why" forward. (Advisory — not addressed.)
- `CLAUDE.md:5-11` — still reads "Pre-implementation... there is no code" and instructs the next
  implementer to update it "when implementation lands." This card is that landing; the section is now
  stale. (CLAUDE.md is edit-protected by a hook — flagged to the driver separately, not fixed here.)

### Checked and clean
- `src/ui/App.tsx`, `src/ui/main.tsx`, `index.html`, `eslint.config.js`, the tsconfig family each
  legible standalone; the `.js`-extension convention consistent across all relative imports. The
  `void uiDistDir` comment explains *why* an apparently-dead call exists — the right kind of comment.
