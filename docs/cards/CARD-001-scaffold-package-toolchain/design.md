# CARD-001 — Design: Scaffold the TypeScript package and toolchain

## Intent
Create the toolchain floor the whole project stands on: a `kanban-flow-viewer` npm package
whose lint, typecheck, test and build gates all execute against real code. This card owns the
*gates*, not the product — CARD-002 wires these same scripts into CI, CARD-003 publishes the
artifact they produce, CARD-004+ implement the parser/server/UI against the layout fixed here.

The card's binding scope note governs every decision below: hold the REQ-006 footprint to the
bare entry points REQ-036's gates need something real to run against.

## Acceptance criteria
Sharpened into observables. AC-2 is restated — see ADR-0003 for why the original parenthetical
is a false green.

| # | Observable | Spec |
|---|---|---|
| AC-1 | On a clean checkout, `npm ci` exits 0 against the committed lockfile, then `npm run lint` exits 0. ESLint reports at least one error when a lint violation exists in **either** `src/server` or `src/ui`. | REQ-036 |
| AC-2 | `npm run typecheck` exits 0 **and actually checks**: a type error introduced in any of `src/server/paths.ts`, `src/ui/App.tsx` or `vite.config.ts` makes it exit non-zero. | REQ-036 |
| AC-3 | `npm test` runs Vitest and exits 0 with ≥1 real test; `npm run test:coverage` reports ≥90% (lines/functions/branches/statements) on the core logic layer. | REQ-036, Testing |
| AC-4 | `npm run build` exits 0 and produces `dist/ui/index.html` plus a hashed JS asset, and `dist/server/index.js` with an executable shebang. | REQ-006, REQ-007 |
| AC-5 | package.json declares `bin: { "kanban-flow-viewer": "dist/server/index.js" }` and `files: ["dist"]`; `npm pack --dry-run` lists both `dist/server/index.js` and `dist/ui/index.html` in the tarball. | REQ-006, REQ-007 |

## In scope
- `package.json`: metadata, `type: module`, `engines`, scripts, `bin`, `files`, devDependencies only.
- TypeScript configs: `tsconfig.json` (solution) + `tsconfig.base.json` + per-half app/node/server configs.
- `eslint.config.js` (flat, ESLint 9) covering both halves; `vite.config.ts` (build + Vitest block).
- Minimal server entry (`src/server/index.ts`) and one pure function (`src/server/paths.ts`).
- Minimal UI entry (`index.html`, `src/ui/main.tsx`, `src/ui/App.tsx`, CSS, `vite-env.d.ts`).
- Two test files: `src/server/paths.test.ts`, `test/packaging.test.ts`.

## Out of scope
- **CI workflow files** — CARD-002. **Release/publish workflow, provenance, NPM_TOKEN** — CARD-003.
- **Runtime dependencies** (gray-matter, chokidar) — they land with the cards that use them (KNOWLEDGE gotcha).
- **Any real behaviour:** CLI flag parsing (REQ-010–013), startup validation (REQ-014), HTTP routes
  (REQ-015–018), the parser (REQ-020/021), board rendering (REQ-023+). The entry points are placeholders.
- **jsdom + React Testing Library + a UI Vitest project** — added by the first component-test card.
  No UI component test exists here; `npm run build` is what proves the UI half compiles.
- **Property testing (fast-check)** — the invariant surface here is one path function; deferred to
  CARD-004 (parser), where invariants earn their keep.
- **Windows support** — the spec never requires it; dev is macOS, CI is ubuntu (CARD-002). Path
  assertions are POSIX.

## Dependencies & assumptions
- `depends_on: []` — first card; the tree is genuinely empty (no package.json, no src/).
- `.gitignore` already covers `node_modules/`, `dist/`, `coverage/`, `*.tsbuildinfo` — verified, no diff needed.
- Assumes TypeScript ≥ 5.6 for `tsc -b --noEmit` (ADR-0003 records the fallback), ESLint 9 flat
  config, Vitest 3 (`projects`, not the deprecated `workspace`), Node ≥ 20 available locally and in CI.
- Consumers of this floor: CARD-002 (runs these four scripts), CARD-003 (`npm run build` + `files`),
  CARD-004 (adds gray-matter to `dependencies`, adds tests under the existing Vitest config).
- `package-lock.json` is `size_exclude`; it is committed and is what `npm ci` reads.

## Approach
Two builders, one `dist`, no runtime deps: `tsc` emits `src/server` → `dist/server`, Vite emits
`src/ui` → `dist/ui`, and the package ships `files: ["dist"]` with `bin` at `dist/server/index.js`.
The halves need incompatible compiler settings, so each gets its own tsconfig extending a shared base.

The design's one load-bearing insight: **a gate that cannot fail is not a gate.** Under the
idiomatic Vite multi-tsconfig layout, AC-2's literal `tsc --noEmit` checks zero files and exits
zero (root config is `files: []`). Every gate here is therefore verified by mutation during
implementation, not by observing a green run — see Test strategy.

The single pure function, `uiDistDir`, is deliberate: it is the exact seam where the build-layout
decision becomes code, it is what CARD-005's server will call to serve REQ-015's `GET /`, and it
demonstrates the boundary convention later cards follow (pure logic over plain data; I/O only in
`index.ts`). `test/packaging.test.ts` then pins the implicit contract between tsc's outDir, Vite's
outDir, `bin` and `uiDistDir` so the three cannot drift apart silently.

### Alternatives considered
1. **Bundle the server with tsup/esbuild instead of tsc.** Rejected: adds a devDependency and a
   bundling config for a package that has no runtime deps to bundle. `tsc` already runs for the
   typecheck gate; emitting from it is free. Revisit only if server cold start becomes a problem.
2. **One flat tsconfig for both halves.** Rejected: the server needs `module: NodeNext` + Node libs;
   the UI needs `moduleResolution: bundler` + DOM libs + JSX. A single config forces the union, so
   `document` typechecks inside server code and DOM globals leak into Node modules — illegal states
   made representable, and exactly the drift this layer exists to prevent.
3. **A separate `vitest.config.ts` rather than a `test` block in `vite.config.ts`.** Rejected: two
   configs would duplicate the React plugin and alias setup that component tests will need, and give
   two places for the build layout to drift from. One config, imported by the packaging test.
4. **Add jsdom/RTL and a UI smoke test now.** Rejected under the card's scope note: it pre-empts the
   component-test card, adds three devDeps and ~40 lines, and `npm run build` already proves the UI
   half compiles and bundles.

## Interfaces
```ts
// src/server/paths.ts — pure, no I/O, no fs access
/**
 * Absolute path of the built UI bundle directory, resolved relative to a module
 * inside dist/server. Given dist/server/index.js, returns dist/ui.
 * @param serverModuleUrl a file: URL (typically import.meta.url)
 * @throws TypeError if serverModuleUrl is not a file: URL
 */
export function uiDistDir(serverModuleUrl: string): string;
```
```ts
// src/server/index.ts — the I/O edge. Shebang #!/usr/bin/env node.
// Prints the REQ-010 usage line to stderr and sets process.exitCode = 64 (EX_USAGE).
// Placeholder: CARD-005+ replaces the body. No exported API. Excluded from coverage.
```
```ts
// src/ui/App.tsx
export default function App(): JSX.Element;   // placeholder markup only
```
Module boundaries: `src/server` may never import from `src/ui` or DOM types; `src/ui` may never
import from `src/server` (it talks to the server over HTTP, REQ-016/017). The two tsconfigs
enforce this by construction — this is the primary reason for the split.

## Data flow
No runtime data flow exists yet (no server, no parser). The flow this card creates is the **build
and gate** flow:

```
npm ci ──> node_modules (from committed package-lock.json)
  ├─ npm run lint       ──> eslint.config.js ──> src/server/**, src/ui/**, *.config.ts
  ├─ npm run typecheck  ──> tsc -b --noEmit ──> tsconfig.{server,app,node}.json (all three)
  ├─ npm test           ──> vitest (node env, vite.config.ts) ──> *.test.ts
  └─ npm run build
       ├─ build:ui      ──> vite build ──> dist/ui/{index.html, assets/*.js}
       └─ build:server  ──> tsc -b tsconfig.server.json ──> dist/server/index.js (+ .d.ts)
                                                   │
                            npm pack ── files:["dist"] ──> tarball ──> npx bin: dist/server/index.js
                                                                        └─ uiDistDir(import.meta.url) ──> dist/ui
```
No schema, no migrations, no persistence. The only durable contract is the `dist/server` ↔ `dist/ui`
sibling layout, consumed by CARD-003's publish and CARD-005's static serving.

## Implementation task list
Each task is one red→green→commit cycle. Paste real command output as evidence (never report an
unobserved result). Tasks 1–2 bootstrap the runner, so their "red" is a command failure, not a test.

1. **Bootstrap the manifest.** Create `package.json`: `name: kanban-flow-viewer`, `version: 0.0.0`,
   `private: false`, `type: module`, `engines: { node: ">=20" }`, empty `dependencies`, devDeps
   (typescript ^5.9, eslint ^9, @eslint/js, typescript-eslint ^8, globals, eslint-plugin-react-hooks,
   eslint-plugin-react-refresh, vite, @vitejs/plugin-react, vitest, @vitest/coverage-v8, @types/node,
   react, react-dom, @types/react, @types/react-dom). Run `npm install` to generate and commit
   `package-lock.json`; verify `rm -rf node_modules && npm ci` exits 0. **Commit.**
2. **TypeScript configs + the typecheck gate.** Create `tsconfig.base.json` (`strict: true`,
   `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`, `skipLibCheck`, no
   include/files); `tsconfig.server.json` (extends base; `module`/`moduleResolution: NodeNext`,
   `lib: [ES2023]`, `types: ["node"]`, `outDir: dist/server`, `composite: true`, include
   `src/server/**/*.ts` + `test/**/*.ts`); `tsconfig.app.json` (extends base; `moduleResolution:
   bundler`, `jsx: react-jsx`, `lib: [ES2023, DOM, DOM.Iterable]`, `noEmit: true`, `composite: true`,
   include `src/ui`); `tsconfig.node.json` (extends base; include `vite.config.ts`, `noEmit: true`,
   `composite: true`); `tsconfig.json` (`{ "files": [], "references": [server, app, node] }`, **no
   comments** — task 4 JSON.parses tsconfig.server.json). Add `"typecheck": "tsc -b --noEmit"`.
   **Verify it is a real gate (do all three, revert each):** insert `const n: number = "x";` into
   `src/server/paths.ts`, then `src/ui/App.tsx`, then `vite.config.ts` — each must make
   `npm run typecheck` exit non-zero. Also record that plain `tsc --noEmit` exits **zero** with the
   error present (the false green ADR-0003 documents). If `tsc -b --noEmit` errors on the pinned
   TypeScript, fall back to three chained `tsc -p <config> --noEmit` runs and re-run all three
   mutations. **Commit.**
3. **RED→GREEN: the pure path function.** Write `src/server/paths.test.ts` first (assertions in Test
   strategy); run `npx vitest run` — RED (`Cannot find module './paths.js'`). Add `vite.config.ts`
   (`import { defineConfig } from 'vitest/config'`; **export a plain object, not a function**;
   `plugins: [react()]`, `build.outDir: 'dist/ui'`, `test: { environment: 'node', coverage: {
   provider: 'v8', include: ['src/server/**/*.ts'], exclude: ['src/server/index.ts',
   '**/*.test.ts'], thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 } } }`).
   Add scripts `"test": "vitest run"`, `"test:coverage": "vitest run --coverage"`. Re-run — still
   RED. Implement `src/server/paths.ts` (`fileURLToPath` + `path.resolve(dirname, '..', 'ui')`;
   throw `TypeError` for a non-`file:` protocol). `npm test` — GREEN. `npm run test:coverage` — ≥90%.
   **Mutation check:** change `'..','ui'` to `'..','ui2'` → paths.test.ts must go RED; revert. **Commit.**
4. **RED→GREEN: the packaging contract.** Write `test/packaging.test.ts` (assertions in Test
   strategy) — RED (no `bin`/`files`). Add to package.json: `"bin": { "kanban-flow-viewer":
   "dist/server/index.js" }`, `"files": ["dist"]`, `"build:ui": "vite build"`, `"build:server":
   "tsc -b tsconfig.server.json"`, `"build": "npm run build:ui && npm run build:server"`. GREEN.
   **Mutation check:** delete `bin` → RED; drop `"dist"` from `files` → RED; change vite `outDir` to
   `'dist/web'` → RED. Revert each. **Commit.**
5. **Server entry point.** Create `src/server/index.ts`: `#!/usr/bin/env node` as line 1, import
   `uiDistDir` from `./paths.js` (**explicit .js extension** — NodeNext), print the REQ-010 usage
   line to stderr, set `process.exitCode = 64`. No flag parsing, no server. **Commit.**
6. **UI entry points + the build.** Create `index.html` (root; `<div id="root">`, `<script
   type="module" src="/src/ui/main.tsx">`), `src/ui/main.tsx` (createRoot render), `src/ui/App.tsx`
   (placeholder markup naming the product), `src/ui/index.css`, `src/ui/App.css`,
   `src/ui/vite-env.d.ts` (`/// <reference types="vite/client" />`). Run `npm run build` — verify
   `dist/ui/index.html` and `dist/ui/assets/*.js` exist, `dist/server/index.js` exists and its first
   line is the shebang. Run `node dist/server/index.js` — confirm the usage line and exit code 64.
   **Commit.**
7. **ESLint flat config + the lint gate.** Create `eslint.config.js`: `ignores: ['dist/**',
   'coverage/**']`; base `@eslint/js` + `typescript-eslint` recommended for all TS; a `src/ui/**`
   block adding react-hooks + react-refresh with browser globals; a `src/server/**` + `test/**`
   block with node globals. Add `"lint": "eslint ."`. `npm run lint` — exits 0. **Verify it is a real
   gate (both, revert each):** add an unused variable to `src/server/paths.ts`, then to
   `src/ui/App.tsx` — each must make `npm run lint` exit non-zero. **Commit.**
8. **Verify the published tarball.** Run `npm pack --dry-run` after a clean `npm run build`; confirm
   the listing contains `dist/server/index.js` and `dist/ui/index.html`. This is not assumable —
   `dist/` is gitignored and npm's packlist has historically applied .gitignore inside `files`
   entries. If dist is missing, the recorded fix is an explicit `!dist` negation or `.npmignore`;
   record whichever was needed. **Verify the full AC set end to end** on a clean checkout:
   `rm -rf node_modules dist && npm ci && npm run lint && npm run typecheck && npm test && npm run build`.
   **Commit.**

## Test strategy
Two test files, both real and both mutation-checked. Coverage target (90% on the core logic layer)
applies to `src/server/**/*.ts` **excluding** `src/server/index.ts` — entry points are the I/O edge,
proven by task 6's smoke run, not by unit tests. With only `paths.ts` in scope, 100% is expected;
the threshold is configured now so CARD-004 inherits the dial already set.

**`src/server/paths.test.ts` — `uiDistDir`.** Expected values are computed by hand from the layout
contract, never by restating `path.resolve` in the assertion. POSIX paths (dev macOS, CI ubuntu).
- `uiDistDir('file:///a/b/dist/server/index.js')` → exactly `'/a/b/dist/ui'`.
- Nested module: `uiDistDir('file:///a/b/dist/server/http/serve.js')` → `'/a/b/dist/server/ui'` is
  **wrong**; the contract is "a module directly in dist/server", so this case asserts the documented
  limitation explicitly rather than pretending it generalises — assert `'/a/b/dist/server/ui'` and
  keep the JSDoc honest about the precondition.
- Percent-encoded path: `uiDistDir('file:///a/b%20c/dist/server/index.js')` → `'/a/b c/dist/ui'`.
  This is the negative case that kills a naive `url.replace('file://', '')` implementation.
- Non-file URL: `expect(() => uiDistDir('https://example.com/x.js')).toThrow(TypeError)`.
- Real self-location: `uiDistDir(pathToFileURL('/repo/dist/server/index.js').href)` ends with
  `'/dist/ui'` and does not contain `'/server/'`.

**`test/packaging.test.ts` — the build-layout contract.** Reads `package.json` and
`tsconfig.server.json` with `JSON.parse` (both must stay comment-free) and imports `vite.config.ts`
(must export a plain object).
- `pkg.bin` deep-equals `{ 'kanban-flow-viewer': 'dist/server/index.js' }` — exact literal.
- `pkg.files` contains `'dist'`.
- `pkg.type === 'module'`; `pkg.dependencies` is undefined or `{}` (guards the KNOWLEDGE gotcha:
   a runtime dep added here silently blows the size budget and the npx cold-start contract).
- `pkg.scripts` has keys `lint`, `typecheck`, `test`, `build` (the four gates CARD-002 will call).
- `viteConfig.build.outDir === 'dist/ui'` and
  `tsconfigServer.compilerOptions.outDir === 'dist/server'`.
- **The seam:** `uiDistDir(pathToFileURL(resolve(repoRoot, pkg.bin['kanban-flow-viewer'])).href)`
  equals `resolve(repoRoot, viteConfig.build.outDir)`. This is the one assertion that makes bin,
  tsc's outDir, Vite's outDir and the path function unable to drift apart.

**Mutation per acceptance criterion** (a test that survives its mutation is not a test):
| AC | Mutation | What must go red |
|---|---|---|
| AC-1 | Unused variable in `src/server/paths.ts`; separately in `src/ui/App.tsx` | `npm run lint` non-zero for **each** — proves the flat config actually covers both halves, not just one |
| AC-2 | `const n: number = "x"` in `paths.ts`; in `App.tsx`; in `vite.config.ts` | `npm run typecheck` non-zero for **each**. Plain `tsc --noEmit` survives all three — that is the evidence for ADR-0003 |
| AC-3 | `uiDistDir` returns `'..','ui2'`; separately, delete the percent-decode | `paths.test.ts` red |
| AC-4 | Vite `outDir` → `'dist/web'`; separately, delete `build:ui` from the `build` script | `packaging.test.ts` red; `npm run build` leaves no `dist/ui` (task 6/8 evidence) |
| AC-5 | Delete `bin`; drop `'dist'` from `files` | `packaging.test.ts` red; `npm pack --dry-run` omits dist |

**Gates that must pass:** `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`,
`npm run test:coverage` (≥90%), `npm run build`, `npm pack --dry-run`. No network in tests, no fixed
clock or seed needed (nothing time- or random-dependent). No mocks anywhere — `uiDistDir` is pure and
the packaging test reads real committed files, which is the point.

**Size:** the slice baseline was 333 lines (rounded to 360). This design adds `tsconfig.base.json`
(~18) and `test/packaging.test.ts` (~45), and splits `index.ts` into `index.ts` + `paths.ts`.
Revised bottom-up ≈ **392 lines** excluding `package-lock.json` (`size_exclude`) — comfortably under
the 500 limit, with no runtime dependencies per the KNOWLEDGE gotcha.

## Spec references
Downstream phases need only these sections:
- **REQ-006** (Architecture — TypeScript npm package with a server half and a UI half): fixes
  `src/server/` + `src/ui/` and the package name; the source of AC-4/AC-5's structure.
- **REQ-007** (Architecture — The UI is built at publish time, not at `npx` time): the reason Vite
  output ships inside `files` and the reason React is a devDependency, not a dependency.
- **REQ-036** (Continuous integration and release — Every pull request runs lint, typecheck, tests
  and build): the four gates this card creates; CARD-002 wires them to CI.
- **REQ-037** (Continuous integration and release — Pushing a `vX.Y.Z` tag publishes a release):
  read only for the constraint that `npm run build` must be publish-ready; CARD-003 owns it.
- **REQ-010** (CLI — Launched via `npx` against a repository path): the shape of the placeholder
  usage line only. Flag behaviour (REQ-011–013) is out of scope.
- **REQ-015** (Server — `GET /` serves the built React app): the motivation for `uiDistDir`; CARD-005
  implements the serving.
- **Testing** section (Unit/Integration/Component): establishes Vitest as the runner (not a decision
  this card makes) and confirms component/integration tests belong to later cards.

## Proposed ADRs

### ESM-only package targeting Node 20+
**Context.** The package is a hybrid Node CLI + React SPA launched via `npx`. Vite, Vitest and
ESLint 9's flat config are all ESM-native; the server half must interoperate with them. CJS/ESM is a
whole-tree decision that every later card (CARD-004+ parser, server, UI) inherits, and reversing it
after ~30 source files exist means rewriting every import and re-testing bin resolution.

**Decision.** Ship `"type": "module"` with `engines.node >= 20`. The server compiles to ESM
(`module: NodeNext`); relative imports in `src/server` carry explicit `.js` extensions. No dual
CJS/ESM build, no `exports` back-compat shim. Module-relative paths use `import.meta.url` +
`fileURLToPath`, never `__dirname`.

**Consequences.** Easier: one module system across server, UI, configs and tests; `eslint.config.js`
and `vite.config.ts` need no interop shim; `import.meta.url` gives the bin a reliable self-locating
path for the UI bundle. Harder: Node < 20 is unsupported (acceptable — a local dev tool, not a
library); any CJS-only dependency a later card wants must be interop-checked; the
`.js`-extension-on-TS-imports rule is a recurring papercut ESLint must enforce.

### Build and publish layout: two builders, one dist, no runtime dependencies
**Context.** REQ-006 splits the package into a server half and a UI half; REQ-007 requires the React
SPA be built at publish time, not at `npx` time. The two halves need incompatible TypeScript settings
(Node libs + NodeNext resolution vs DOM libs + bundler resolution + JSX), so one compiler cannot serve
both. The layout is consumed by CARD-002 (CI gates), CARD-003 (publish) and CARD-005+ (the server that
serves the bundle), so changing it later breaks three cards' contracts at once.

**Decision.** `tsc -b tsconfig.server.json` emits `src/server` → `dist/server`; Vite emits `src/ui` →
`dist/ui`. `npm run build` runs UI then server. package.json declares
`bin: { "kanban-flow-viewer": "dist/server/index.js" }` and `files: ["dist"]`. The server locates the
bundle at runtime via the pure `uiDistDir(import.meta.url)` (`dist/server/../ui`), never a
hardcoded cwd-relative path. `dependencies` stays empty: React is a devDependency because Vite
bundles it into `dist/ui` at build time.

**Consequences.** Easier: `npx` does zero build work and installs zero runtime deps, so cold start is
a tarball unpack (REQ-007); each half gets the compiler settings it needs; the bundle path survives
being run from any cwd. Harder: `dist/` is gitignored yet shipped, so tarball contents must be
verified with `npm pack --dry-run` rather than assumed; two build steps must stay ordered in CI; the
`dist/server` ↔ `dist/ui` sibling relationship is an implicit contract between tsc's outDir, Vite's
outDir and `uiDistDir` — `test/packaging.test.ts` exists specifically to pin it.

### Typecheck runs `tsc -b --noEmit` across per-half projects, not `tsc --noEmit`
**Context.** The build layout above forces three TypeScript projects (server, app, node/config-files).
The idiomatic Vite arrangement is a root `tsconfig.json` that is a solution file — `files: []` plus
`references` — with the real settings in `tsconfig.{server,app,node}.json`. CARD-001's acceptance
criterion names the gate as `tsc --noEmit`, but under this layout that command resolves the root
config, finds zero input files, and exits zero having checked nothing: a gate that passes on a
codebase full of type errors. CARD-002 wires this exact script into CI, so a false green here
silently disables REQ-036's type gate for the life of the project.

**Decision.** `npm run typecheck` runs `tsc -b --noEmit` (TypeScript ≥ 5.6, pinned), which walks the
root config's project references and checks all three projects. Plain `tsc --noEmit` is never used as
a gate. The gate's honesty is proven, not assumed: implementation injects a type error into
`src/server/paths.ts`, `src/ui/App.tsx` and `vite.config.ts` in turn and records that each turns the
gate red. If the pinned TypeScript rejects `-b --noEmit`, the recorded fallback is three explicit
`tsc -p <config> --noEmit` runs chained with `&&` — same contract, same mutation evidence.

**Consequences.** Easier: one command checks every project including config files; editors get correct
per-file settings from the solution layout; adding a fourth project (e.g. a jsdom test project when
component tests land) means one more reference, not a new script. Harder: leaf configs must be
`composite: true`, pulling in `.tsbuildinfo` files (already gitignored) and incremental-build
staleness as a possible confusion source; `tsc --noEmit` remains available at the terminal as a
footgun that looks like it works, mitigated only by the KNOWLEDGE entry; this deviates from the
literal wording of CARD-001's AC-2, which the sharpened criterion restates as an observable.
