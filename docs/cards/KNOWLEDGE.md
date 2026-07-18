# Knowledge

Cross-card knowledge captured by `/kanban` from phase agents. Entries are prefixed
`[CARD-NNN]`. Decisions live in ADRs (`adr_dir`), not here.

## Conventions

- [CARD-001] The typecheck gate is `tsc -b --noEmit`, never plain `tsc --noEmit`: the root
  tsconfig.json is a solution file (`files: []` + references), so `tsc --noEmit` at the root
  checks zero files and exits zero — a false green.
- [CARD-001] React/react-dom are devDependencies, not dependencies: Vite bundles them into
  dist/ui at build time (REQ-007), so the published package carries no runtime copy.
  `dependencies` is empty until a card needs a true runtime dep (gray-matter/chokidar, CARD-004+).
- [CARD-001] Coverage measures the core logic layer only — `src/server/**/*.ts` minus entry
  points (`src/server/index.ts`), which are the I/O edge and are proven by the build/smoke step
  instead. Threshold 90% (lines/functions/branches/statements).
- [CARD-001] npm's packlist honored `files: ["dist"]` directly despite `dist/` being gitignored — no
  `!dist` negation or `.npmignore` was needed with npm 11.3.0. Re-verify with `npm pack --dry-run` if
  the npm version pin ever changes.
- [CARD-004] `card.md` frontmatter keys are snake_case (`depends_on`, `design_pr_url`, `pr_urls`,
  `split_slices`, `estimated_lines`, `actual_lines`); the card model's fields are camelCase — the parser
  (CARD-019) is the single mapping point between the two naming conventions.
- [CARD-004] The canonical phase-doc filename set (slice/design/implement/test/review/deliver + their
  `*-check` docs) is defined once in the parser (CARD-020, for REQ-025's presence scan); CARD-011
  (blocked-flag rendering) and CARD-018 (serving phase docs) should reuse it rather than re-deriving.
- [CARD-019] `gray-matter` is the project's first runtime dependency (`dependencies`, not
  `devDependencies`) — see ADR-0005, which amends ADR-0002's "zero runtime deps" consequence. It ships
  its OWN bundled types (`gray-matter.d.ts` via package.json `typings`), which resolve under
  NodeNext/verbatimModuleSyntax via `import matter from 'gray-matter'` (esModuleInterop + `export =`).
  **`@types/gray-matter` does NOT exist on npm (404) and must not be added** — the design phase wrongly
  assumed it was needed; the implementer confirmed `tsc -b --noEmit` is green without it.
- [CARD-019] The card model uses an EXPLICIT typed frontmatter→field map (not a generic snake→camel
  key transform): the model is a closed, intentional JSON API contract (ADR-0005), so unmodeled
  frontmatter keys (`reqs`, `right_sized`, `review_lenses_failed`) are deliberately dropped and every
  field gets its own coercion + default. `parseCard(raw, options)` takes an options object precisely so
  future inputs (CARD-020's phase-doc `entries`) extend additively without a signature redesign.
- [CARD-002] CI lives in ONE reusable workflow `.github/workflows/ci.yml` with
  `on: [pull_request(branches: main), workflow_call]`; the four gates run as sequential steps in a
  single Node 20 ubuntu job after `npm ci`, in the order **lint → typecheck → build → test** (build
  BEFORE test — see the coupling gotcha below; this differs from ADR-0004's Decision-text order, which
  is stale on this one point, its substance unchanged). CARD-003's release reuses the gates via
  `uses: ./.github/workflows/ci.yml` — the filename, job, and order are a cross-card contract, do not rename.
- [CARD-002] CI caches only `~/.npm` via `actions/setup-node` `cache: npm` (keyed on package-lock.json);
  it never adds `actions/cache` for `dist/` or `*.tsbuildinfo`. `build:server`'s `--force` is the belt,
  no-build-state-cache is the suspenders against the stale-`.tsbuildinfo` false green (ADR-0003).

## Gotchas

- [CARD-001] The size_limit margin on toolchain/scaffolding cards leans on
  package-lock.json being size_exclude — keep package.json to devDependencies only for
  the tooling being scaffolded (no runtime deps like gray-matter/chokidar) to stay
  comfortably under the cap; those land with the cards that actually use them (CARD-004+).
- [CARD-001] vite.config.ts must export a plain object (not a config function) and
  tsconfig.server.json must stay comment-free — test/packaging.test.ts imports the former and
  JSON.parses the latter to assert the build layout hasn't drifted from package.json's bin/files.
- [CARD-001] `dist/` is gitignored but shipped via package.json `files` — npm's packlist has
  historically applied .gitignore inside `files` entries. Never trust it by inspection: verify
  with `npm pack --dry-run` that dist/server and dist/ui appear in the tarball.
- [CARD-001] A task's verification step can only target files that exist by that task. Scaffolding
  cards invert normal TDD order (runner before tests), so gate-mutation checks must be sequenced
  after the files they mutate land — or use throwaway stubs.
- [CARD-001] @types/react 19 removed the global `JSX` namespace — component return types are
  `React.JSX.Element`, not `JSX.Element`. Bare `JSX.Element` fails the typecheck gate under the
  react-jsx transform.
- [CARD-001] Leaf tsconfigs use `include`, not `files: []`, so TS18003 ("No inputs were found") CAN
  fire on them — unlike the solution root, where files/references suppress it. `tsc -b` over a leaf
  config whose include dir is still empty errors rather than passing.
- [CARD-001] `tsc -b` + composite project references: a leaf tsconfig's `include` spanning multiple
  top-level dirs (e.g. `src/server/**/*.ts` + `test/**/*.ts`) with no explicit `rootDir` makes
  `tsc -b` infer the common ancestor as rootDir, nesting build output
  (`dist/server/src/server/index.js` instead of `dist/server/index.js`) and breaking any fixed `bin`
  path. Fix: pin `rootDir` explicitly and keep cross-cutting test files in their own project.
- [CARD-001] `tsc -b --noEmit` at a solution root errors TS6310 ("Referenced project may not disable
  emit") the moment any project has a formal `references` edge to another composite project — the CLI
  `--noEmit` flag propagates to referenced projects too. Avoid formal cross-project `references` for
  files that only need type info from another project; give them a self-contained `include` list.
- [CARD-001] `tsc -b` trusts stale `.tsbuildinfo` and silently no-ops (exit 0, nothing emitted) if
  `dist/` is deleted without also clearing `*.tsbuildinfo` — it does not always re-verify declared
  outputs exist on disk. A fresh clone never hits this (`.tsbuildinfo` is gitignored), but CI caching
  of build state without also caching `dist/`, or a developer's `rm -rf dist`, will. Fixed by adding
  `--force` to `build:server`; **CARD-002 must not cache `*.tsbuildinfo` across CI runs without also
  caching `dist/`**.
- [CARD-001] A leaf tsconfig with no explicit `types` array auto-includes every `node_modules/@types`
  package (incl. `@types/node`), silently leaking Node ambient globals (`process`, `Buffer`,
  `__dirname`) into a browser/UI project — the project-reference split looks like it enforces the
  server/UI boundary but does NOT. Pin `types` on every leaf config: `["vite/client"]` for the UI
  project, `["node"]` for server/node/test projects. (Found in review; the boundary is load-bearing
  for every `src/ui` card.)
- [CARD-001] An emitting tsc project (has `outDir`, no `exclude`) compiles AND emits any co-located
  `*.test.ts` matching its `include` glob straight into `dist/` — and, since `files: ["dist"]`, into
  the published npm tarball. Always pair a `src/**/*.ts` include with `exclude: ["**/*.test.ts"]` on
  the emitting project, and give the noEmit typecheck project the matching include so coverage isn't
  silently lost. **Critical for CARD-004+ (co-located tests) and CARD-003 (publish).** Guarded by
  `test/packaging.test.ts`'s tarball-set assertion.
- [CARD-001] `@types/react`'s global `React` namespace augmentation is program-wide, not per-file:
  pinning `types: ["vite/client"]` on the UI tsconfig to exclude Node globals does NOT break a
  component's bare `React.JSX.Element` annotation, because any other file in the same program (e.g.
  `main.tsx`) explicitly `import`ing `'react'` loads @types/react's ambient declarations for every
  file.
- [CARD-001] Contract-pinning tests (e.g. `test/packaging.test.ts`) should assert literal script/config
  values, not just key presence, when the design names an exact regression string (here ADR-0003's
  `tsc -b --noEmit` vs plain `tsc --noEmit`) that a presence-only check would let through silently.
- [CARD-002] Gate-isolation seeds for proving each CI gate goes red independently (each on clean main,
  only that change): **lint** = unused local in `src/server/paths.ts` (eslint `no-unused-vars` fires; base
  tsconfig has no `noUnusedLocals` and eslint uses `recommended` not type-checked, so lint-only);
  **typecheck** = an EXPORTED const with a mismatched type (exported → `no-unused-vars` stays silent, no
  type-aware lint rule → lint green, `tsc -b --noEmit` red); **test** = a failing `expect(2).toBe(3)`
  (valid TS+lint, vitest red); **build** = point `index.html`'s `<script src>` at a missing file
  (tsc/eslint/vitest never read index.html; vite build red).
- [CARD-019] Unquoted ISO dates in card.md frontmatter (`created: 2026-07-18`) parse to JS `Date`
  objects via gray-matter's js-yaml engine, NOT strings. The parser coerces date-ish fields to
  `'YYYY-MM-DD'` strings (`Date` → `toISOString().slice(0,10)`; string passthrough; else `''`). Assert
  `typeof === 'string'`, never trust the raw gray-matter value — a `Date` leaking into the `/api/board`
  JSON would be a defect.
- [CARD-019] A new non-test `src/server/*.ts` module imported by a co-located `*.test.ts` must be added
  explicitly to `tsconfig.test.json`'s `include` (as `paths.ts` already is): the test project is
  composite and its include only globs `**/*.test.ts`, so a non-test file in the program errors TS6307
  unless listed. The server project's `src/server/**/*.ts` glob already covers it for the build; do NOT
  add a cross-project `references` edge (CARD-001's TS6310 trap).
- [CARD-002] `test/packaging.test.ts`'s "ships no test files in the published tarball" test (CARD-001)
  shells out to `npm run build` via `execFileSync` — so the **test gate depends on the build gate**.
  CI must run build BEFORE test (lint→typecheck→build→test), or a build-only breakage surfaces as a red
  TEST step (with build never reached), breaking per-gate attribution. Any future gate-ordering design
  must account for this coupling.
- [CARD-019] Adding the project's first runtime dependency breaks CARD-001's `test/packaging.test.ts`
  assertion that pinned ADR-0002's zero-runtime-deps consequence verbatim. A card whose ADR amends that
  consequence (as ADR-0005 does for `gray-matter`) must ALSO update that specific assertion (now:
  `dependencies` deep-equals `['gray-matter']`), or `npm test` goes red though the new code is correct.
- [CARD-019] A `for (let i = start; i < arr.length; i++) { arr[i] ?? fallback }` loop under
  `noUncheckedIndexedAccess` leaves an unreachable branch (the `?? fallback` never fires) that v8
  coverage counts against the branch threshold. Prefer `for (const item of arr.slice(start))` to avoid
  indexed access rather than writing a test for genuinely dead code.
- [CARD-019] **`parseCard` is NOT total** — `matter(raw)` throws a `YAMLException` on malformed
  frontmatter (unterminated quote, bad indentation, duplicate keys). No-frontmatter and scalar/list
  frontmatter degrade to defaults, but a syntax error propagates. Since `card.md` is untrusted (REQ-002),
  **CARD-005's board walk MUST wrap each `parseCard` call in try/catch and route failures to the
  `parseErrors` tray (REQ-019/033)** — the parser deliberately does not self-heal.
- [CARD-019] Card-model construction reads gray-matter's `data` only via explicit named fields
  (`data.id`, `data.reworks`, …) and NEVER spreads/iterates it. This is a load-bearing security property:
  js-yaml 3.13+ leaves a hostile `__proto__`/`constructor` in frontmatter as an inert own-key on `data`,
  and explicit reads keep it from reaching the model/JSON API. Do NOT replace with a `{...data}` transform.
- [CARD-019] v8 coverage reports 100% for a branch that **executes but is never asserted on** (a mutation
  there passes all tests). When a coercion helper has multiple enumerated outcomes (design's Interfaces),
  verify each has its OWN asserted fixture — coverage % alone doesn't prove it. (Caught the `asDateString`
  string-passthrough branch shipping unasserted.)
- [CARD-002] Parsing GitHub Actions YAML with js-yaml v4's default schema keeps the `on:` mapping key as
  the string `"on"` (does NOT coerce to boolean `true`). A CI-YAML contract test that asserts a gate is
  blocking should also assert no gate step carries `continue-on-error: true` or a skipping `if:` — those
  turn a gate non-blocking while every command-presence/order assertion stays green (a false green).
- [CARD-002] `ci.yml` pins `actions/checkout`/`actions/setup-node` to major tag `@v4` — acceptable for a
  `contents: read`, secret-free `pull_request` gate job. **CARD-003 must SHA-pin these actions** where it
  extends the workflow under a release job with `NPM_TOKEN` + publish: a compromised `@v4` tag in a
  secret-bearing job is a real supply-chain exposure.
- [CARD-002] **The nyxhub-bot GitHub App needs `Workflows: write` permission to push any
  `.github/workflows/*` file.** Without it GitHub rejects the push: *"refusing to allow an OAuth App to
  create or update workflow `.github/workflows/ci.yml` without `workflow` scope."* This is an App-config
  gap the driver must fix on GitHub.com (add the Workflows permission, re-approve the installation) —
  **never fall back to personal auth** (repo identity doctrine). **Blocks CARD-002 delivery and will
  block CARD-003** (release workflow) identically until granted.
- [CARD-019] A parser + its exhaustive test suite are coverage-coupled and can alone exceed `size_limit`
  before any other file: `pr-splitter`'s refusal here was independently reproducible (`git diff
  --numstat` → the 542-line pair busts the 500 cap on its own) and is correctly **advisory**, not a
  park — `DLV-SIZE` on an already-split-and-refused card verdicts `pass` with the breach recorded, since
  we never split a split.
- [CARD-019→CARD-020] `parse-card.ts`'s `extractSection(content, heading)` interpolates `heading`
  **unescaped** into a `RegExp` — safe for CARD-019's literal callers (`'Why'`/`'Notes'`/`'Acceptance
  criteria'`) but a latent trap the review flagged (advisory, un-actioned). **CARD-020 is the likely
  first computed-heading caller** (its phase-doc scan reuses the parser's helpers): if it ever passes a
  heading containing regex metacharacters, escape it (or literal-match) — do not extend the unescaped
  interpolation. Other un-actioned CARD-019 advisories (all harmless for /kanban's own inputs, logged
  for /retro): `asDateString` shifts the day for a timestamp carrying a time+offset; `countCriteria`
  counts a `- [x]` inside a fenced code block; `asNonNegInt`/`asNumberOrNull` don't enforce their
  name's integer/non-negative constraint.

## Glossary
