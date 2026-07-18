## CARD-001 — Scaffold the TypeScript package and toolchain   [task · infra]

Implementation PR. The design PR (#1) merged; this carries the code plus its phase docs.

### Why

Nothing in this project can be linted, typechecked, tested, built or released until the package
exists. This card establishes the toolchain floor — `package.json`, TypeScript configs, ESLint,
Vitest and Vite, plus minimal server and UI entry points — so every gate REQ-036 requires has
something real to run against. It owns the *gates*, not the product: CARD-002 wires these scripts
into CI, CARD-003 publishes the artifact they produce, CARD-004+ implement the parser/server/UI
against the layout fixed here.

### What changed

- **`package.json`** — ESM (`type: module`), `engines.node >= 20`, **empty `dependencies`** (React is
  a devDependency; Vite bundles it at build time), `bin: { kanban-flow-viewer: dist/server/index.js }`,
  `files: ["dist"]`, and the four gate scripts. `package-lock.json` committed.
- **TypeScript (5-project layout)** — `tsconfig.base.json` (strict family) + per-half `server`/`app`/
  `node`/`test` projects under a `files: []` solution root. `typecheck` runs `tsc -b --noEmit`, which
  actually checks all projects (plain `tsc --noEmit` at the root is a false green — ADR-0003).
- **`src/server/paths.ts`** — the pure `uiDistDir(import.meta.url)` seam (dist/server → dist/ui),
  100% covered; `src/server/index.ts` — placeholder CLI entry (shebang, usage line, exit 64).
- **`src/ui/`** — placeholder React entry points; `vite.config.ts` (build + Vitest block);
  `eslint.config.js` (flat config covering both halves); `index.html`.
- **`test/packaging.test.ts`** — pins the build contract: `bin` ↔ tsc outDir ↔ Vite outDir ↔
  `uiDistDir` (the "seam" assertion), literal gate-command strings, and a tarball-set assertion that
  **no `*.test.*` ships**.

### Acceptance criteria

- [x] `npm ci && npm run lint` exits zero on a clean checkout (REQ-036)
- [x] `npm run typecheck` (`tsc -b --noEmit`) exits zero **and actually checks** (REQ-036; ADR-0003)
- [x] `npm test` runs Vitest and passes — 12 tests (REQ-036)
- [x] `npm run build` produces the UI bundle inside the package (REQ-006, REQ-007)
- [x] `package.json` declares the `kanban-flow-viewer` bin and a `files` list including the built
  bundle; `npm pack` ships both `dist/server/index.js` and `dist/ui/index.html`, and no test files
  (REQ-006, REQ-007)

### Testing

All gates green on a clean tree (`rm -rf node_modules dist coverage && npm ci`): lint 0, typecheck 0,
**12/12 tests**, **100% coverage** on the core logic layer (`paths.ts`, ≥90% target), build produces
the hashed UI bundle + shebang'd server entry, `node dist/server/index.js` prints usage and exits 64,
`npm pack --dry-run` lists 8 files (62.4 kB) with **zero `*.test.*`**. Every gate is mutation-proven
in `implement.md` — a type error injected into each of `paths.ts`/`App.tsx`/`vite.config.ts` turns the
typecheck red; plain `tsc --noEmit` stays green (the documented false green).

### Review

Full 8-lens panel. The first run found **two blocking issues**, both fixed and re-reviewed clean:
1. **Compiled test files shipped in the npm tarball** (`tsconfig.server.json` globbed `*.test.ts` with
   no exclude). Fixed with `exclude: ["**/*.test.ts"]` + a matching `tsconfig.test.json` include so
   typecheck coverage is preserved; now guarded by the tarball-set assertion.
2. **Node globals leaked into the UI project** (`tsconfig.app.json` had no `types` array, so
   `@types/node` auto-loaded). Fixed by pinning `types: ["vite/client"]` — the server/UI compiler
   boundary now holds by construction, as ADR-0002 claims.

Advisory items left for their natural home (a `uiDistDir` JSDoc precondition note for CARD-005; a
`CLAUDE.md` staleness refresh — that file is edit-protected). No blocking findings remain.

### Knowledge

New `KNOWLEDGE.md` entries (this card): pin `types` on every leaf tsconfig or Node globals leak into
the UI; exclude `*.test.ts` from any emitting tsc project or test code ships in the tarball;
`@types/react`'s namespace augmentation is program-wide; contract tests should assert literal values.
ADR-0001/0002/0003 (ESM-only, build layout, typecheck topology) landed with the design PR.

🤖 Card delivered via /kanban
