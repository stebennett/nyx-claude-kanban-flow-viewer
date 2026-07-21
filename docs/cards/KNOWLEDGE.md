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
- [CARD-020] The canonical phase-doc identity — `PHASE_NAMES = ['slice','design','implement','test',
  'review','deliver']` (flow order) plus the `PhaseName`/`PhaseDocPresence`/`PhaseDocsPresent` types —
  lives in the **dependency-free `card-model.ts`**, NOT in `parse-card.ts`. This refines CARD-004's
  "defined once in the parser" note: `parse-card.ts` imports gray-matter (a server-only runtime dep),
  so CARD-011 (UI blocked-flag rendering) reusing the constant from there would bundle gray-matter into
  the browser build. The derivation function `derivePhaseDocsPresent(entries)` stays in `parse-card.ts`;
  CARD-011/CARD-018 reuse the constant + types from `card-model.ts`.
- [CARD-020] The phase-doc presence scan matches filenames with plain string methods
  (`name === '<phase>.md'`; check docs `name === '<phase>-check.md'` OR `name.startsWith('<phase>-check-')
  && name.endsWith('.md')`), NOT via `extractSection`/RegExp — so the CARD-019 unescaped-heading-
  interpolation trap is not engaged. Check-doc matching covers the variants `deliver-check.md`,
  `deliver-check-design.md`, `deliver-check-<k>.md`. `<phase>.md` is an EXACT match, so `deliver-check.md`
  sets `deliver.check` true but leaves `deliver.phase` false.
- [CARD-020] A property test over a multi-branch formula (e.g. `hasCheckDoc`'s exact-OR-prefix match) should
  derive its **expected** value from the arbitrary's own generation metadata/tags — as CARD-019's
  `countCriteria` property does (expectedDone/expectedNotDone come from which tagged-line variant fast-check
  picked) — NOT by retyping the implementation's exact boolean expression a second time. CARD-020's property
  test duplicates the impl expression; review confirmed it still catches mutations (it's typed independently,
  not a call-through), but the tag-based style is strictly more robust against a shared authoring error in the
  design's prescribed formula. Prefer tag-based ground truth for the next multi-branch property test.
- [CARD-003] Secret-bearing GitHub Actions jobs (release.yml's publish) SHA-pin every third-party
  `uses:` to a full 40-hex commit SHA with a trailing `# vX.Y.Z` comment — never a `@vN` moving tag.
  Resolve the SHA with `gh api /repos/<owner>/<action>/git/ref/tags/<tag> --jq .object.sha` (deref
  annotated tags to the commit). The read-only PR-gate `ci.yml` may keep `@v4`; the contract test
  enforces the SHA shape only on non-local (`uses:` not starting `./`) actions.
- [CARD-003] `npm publish --provenance` (needs `id-token: write`) requires `repository.url` in
  package.json or it errors "Provenance generation … requires repository.url". The field points at the
  git remote `stebennett/nyx-claude-flow-viewer` (NOT the local dir name). Adding it does not break
  `test/packaging.test.ts` (which never deep-equals the whole package.json — see [CARD-001]).
- [CARD-003] The release version guard compares `github.ref_name` (the tag, e.g. `v1.2.3`) against
  `v$(node -p "require('./package.json').version")` and `exit 1`s on mismatch, as the FIRST publish-job
  step (after checkout, before build/publish) — so a mismatched or un-bumped version publishes nothing.
  The trigger glob handles shape; the guard handles equality.
- [CARD-021] `BoardSnapshot`/`BoardConfig`/`ParseError` (the `/api/board` JSON contract) live in the
  dependency-free `card-model.ts` beside `CardModel` (ADR-0005), NOT in `build-snapshot.ts` (which pulls
  `fs` + gray-matter) — so the UI can `import type` the API contract without crossing the src/server↔src/ui
  boundary. CARD-022 adds `milestones` to `BoardSnapshot` additively; CARD-006/007/017 reuse these types.
- [CARD-021] `parseError.path` is board-dir-relative with a **forward-slash literal** (`` `${dirName}/card.md` ``,
  `config.md`), never absolute — deterministic across machines and never leaks a tmp/checkout path into the
  `/api/board` JSON. Build it with a `/` string literal, not `path.join` (OS separator). Assert
  `not.toContain(boardDir)` in tests.
- [CARD-021] `DEFAULT_WIP_LIMIT = 3` (matches kanban-init's config default) applies when `config.md` is
  absent OR `wip_limit` is missing/non-numeric; `wip_limit: 0` passes through (0 ≠ missing). config.md
  ABSENT degrades silently to the default; config.md MALFORMED routes to `parseErrors('config.md')` + default
  — the distinction is deliberate (REQ-014 permits a board of only CARD-* dirs). See [[adr-0008]] (the board
  walk is total).
- [CARD-021] `buildSnapshot` sorts the `CARD-*` dir list before walking, so `cards`/`parseErrors` come out
  deterministically ordered (stable client diffing, REQ-009). A `CARD-*` dir missing `card.md` is skipped
  (not a parseError).
- [CARD-003] `release.yml`'s intermediate TDD commits (design tasks 3–4) briefly add the version-guard
  step before the checkout/setup-node steps that make it executable — deliberate increment ordering
  from the design task list, not a bug; the workflow is only semantically complete (checkout precedes
  the guard) after task 4's commit.
- [CARD-021] `readdirSync`'s entry order is NOT guaranteed sorted across filesystems — macOS APFS
  happened to return `CARD-*` dirs already alphabetical locally, which would make a missing `.sort()`
  a false green in local dev. The explicit `.sort()` on the dirName list (REQ-009 determinism) must
  be verified by reasoning about the contract, not just by a locally-green test, on filesystems that
  preserve insertion order.
- [CARD-021] fast-check property tests pin an explicit `seed` (see `parse-card.test.ts`'s
  `{ seed: 20260718, numRuns: N }`) for reproducible CI failures — carry the seed convention forward
  on every new `fc.assert` call.
- [CARD-003] Workflow contract tests pin step ORDER via `findIndex` chains (mirroring
  `test/ci-workflow.test.ts`) for every sequence where reordering silently changes behavior — and the
  chain must be EXTENDED to include newly-added terminal steps (e.g. a `gh release create` step after
  `npm publish`), not just the steps present when the order test was first written.
- [CARD-021] When a module + its own test suite alone would still exceed `size_limit` by a small
  margin, check whether the PR also adds pure, dependency-free interface types (`card-model.ts`) with
  zero consumers in the same change — those form a legitimate lead slice (types-only, unused-export,
  builds/lints/tests green standalone) ordered BEFORE the impl+tests slice, without splitting impl from
  its tests or shipping a subject-less test file. (CARD-021: 17-line types slice + 490-line impl+tests
  slice, both green.)
- [CARD-022] Milestone completion is defined once, in `src/server/milestones.ts`: a milestone's `done`
  counts referenced cards whose `status === 'done'` (the sole terminal status in the spec's status enum —
  `split`/`superseded` do NOT count); `total` is the number of card ids listed on the milestone's
  `**Cards:**` line (not the number that resolved to a parsed card), so a milestone id with no parsed card
  contributes to `total` but never to `done` and never throws (mirrors ADR-0008). CARD-006 (UI milestone
  strip) renders these two numbers verbatim and needs no knowledge of the rule.

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
- [CARD-020→CARD-011] `PHASE_NAMES` (and the phase-doc presence types) live in `src/server/card-model.ts`
  — the **server** side of the load-bearing `src/server`↔`src/ui` project boundary (KNOWLEDGE [CARD-001]).
  CARD-011 (UI blocked-flag rendering) needs flow order to infer a blocked card's column from
  `phaseDocsPresent`, but importing `card-model.ts` from `src/ui` would cross that boundary and pull a
  server module (transitively gray-matter-adjacent) into the browser bundle. **CARD-011 must either give
  the constant a UI-reachable home (a shared boundary-neutral module) or re-declare the flow order in the
  UI with an accepted duplication** — do not import `PHASE_NAMES` straight from `src/server` into `src/ui`.
- [CARD-002] **Regenerating `package-lock.json` on a single-platform dev machine (macOS/ARM here) can
  silently collapse npm's `optionalDependencies` platform matrix for native-binary packages** (rollup,
  esbuild, …) down to just that platform — breaking `npm ci` on any OTHER platform, incl. the
  `ubuntu-latest` CI runner (`Cannot find module @rollup/rollup-linux-x64-gnu` at `vite build`). This
  card's own first CI run caught it (real DLV-CI red, not flaky). **Before committing a regenerated
  lockfile, verify the full matrix survives:** `grep -c 'node_modules/@rollup/rollup-' package-lock.json`
  should stay **~25**, not 1. Reliable fix (npm 11): restore the complete lockfile from `main`
  (`git show origin/main:package-lock.json > package-lock.json`) then `npm install --package-lock-only`
  to add the new dep while preserving every platform binary — do NOT `rm package-lock.json && npm install`
  from scratch on one platform. (Note: `js-yaml` was already in `main`'s lockfile as a transitive dep of
  gray-matter, so adding it as a direct devDep needed no new resolution — only `@types/js-yaml` was new.)
- [CARD-020] `new Set(entries ?? [])` — the `?? []` fallback is **behaviorally inert**: `new Set(undefined)`
  already returns an empty Set (V8 native tolerance), so a test asserting identical output for `undefined`
  vs `[]` entries does NOT prove the `??` branch is load-bearing (verified in review: removing `?? []`
  entirely left all 36 tests green). Keep the two call shapes as API-surface tests, but don't claim the
  fallback is mutation-covered. If a future coercion genuinely must distinguish undefined from empty, don't
  lean on this pattern to prove it.
- [CARD-020→CARD-011] `PhaseDocPresence.phase` (boolean, "does `<phase>.md` exist") and `CardModel.phase`
  (string, the card's current flow phase) share the bare name `phase` ~10 lines apart in `card-model.ts`.
  CARD-011, consuming `phaseDocsPresent` for column inference, should avoid a local `const phase = …` that
  shadows/reads as the wrong one (review flagged the overload as advisory; a rename to `{ doc, check }` was
  deferred as it wasn't rework-worthy).
- [CARD-003] GitHub Actions push-tag filter patterns support `[0-9]` ranges and `+` (one-or-more) and
  treat `.` as literal, so `'v[0-9]+.[0-9]+.[0-9]+'` fires on `v1.2.3` / `v10.20.30` but NOT on `v1`,
  `v1.2`, `v1.2.3-rc1`, `v1.2.3.4`, or `latest` (the whole ref must match). This is REQ-037's "other tag
  shapes do not trigger" enforcement; assert the glob with `toStrictEqual`, since loosening it to `v*`
  would trigger on `v1`.
- [CARD-003] KNOWLEDGE [CARD-002]'s rollup-optionalDependencies gotcha still bites any new worktree:
  after `npm ci` on macOS/ARM, `grep -c 'node_modules/@rollup/rollup-' package-lock.json` must stay
  ~25. A regenerated lockfile collapsing it to 1 (darwin-arm64 only) breaks `npm run build` (vite)
  on CI's ubuntu runner ONLY — verify the count before running any test/build step in a fresh card.
- [CARD-021] gray-matter's `matter()` keeps a module-level cache keyed by the exact input string and
  populates that entry BEFORE parsing — so a parse that then throws (malformed YAML) leaves a
  poisoned, empty-data cache entry for that string. A later call with byte-identical content (even
  from an unrelated card) silently returns the poisoned entry instead of re-throwing. Because
  `buildSnapshot` re-parses on every debounced walk (REQ-008) in one long-lived process, an UNCHANGED
  persistently-malformed `card.md` would `parseError` on the first walk but silently "self-heal" with
  empty defaults on every later walk. Fix: call `matter.clearCache()` before every `matter()`-consuming
  call (accessed via a narrow local cast — gray-matter's bundled `.d.ts` omits it, like `matter.cache`,
  per [CARD-019] on why `@types/gray-matter` isn't added). CARD-007 (the SSE watcher, the other
  repeated caller of the card-parsing path) must heed this if it ever calls `matter()`/`parseCard()`
  directly rather than through `buildSnapshot`.
- [CARD-021] `chmod 000` on a dir reliably simulates an unreadable-directory failure (EACCES) for a
  totality/permission test — works non-root locally and on CI's non-root ubuntu-latest runner, and
  even a root-run `chmod 000` still blocks directory traversal (the execute-bit search check isn't
  bypassed by DAC_OVERRIDE when no execute bit is set). Prefer it over mocking `fs`. Restore perms
  (`chmod 0o755`) in `afterEach` BEFORE `rmSync`'s recursive cleanup, or cleanup can't traverse the
  locked dir.
- [CARD-021] A "call X guards scenario Y" regression test is MASKED when its fixture also triggers a
  sibling code path that calls the same guard: the cache-poisoning test with a `config.md` in its
  fixture had `readConfig`'s own `clearMatterCache()` cover for the per-card loop's call, so removing
  either alone still passed. To isolate a guard, the fixture must exclude everything else that happens
  to invoke it (here: omit `config.md`), and you must verify by deleting ONLY the guard-under-test and
  seeing the test go red.
- [CARD-021] `split.md`'s SPL-GREEN evidence must be **pasted command + raw terminal output** per gate
  (vitest summary banner, tsc/eslint/vite output) for the full-branch bootstrap AND each slice's scratch
  build — a narrative summary ("npm test 54/54", "lint clean") FAILS split-check even when the numbers
  are internally consistent. Match the fenced-real-output convention `test.md` already uses.
- [CARD-021] A trailing slice's PR body citing an earlier slice's `split.md` "cumulative tests" count
  (e.g. "75 tests") can go stale by the time that slice's PR opens, if an unrelated card merges new tests
  into `main` in between (here CARD-003's `release-workflow.test.ts`, +15, made the real CI total 90).
  The deliver-checker should reconcile against the PR's actual CI job log before flagging DLV-BODY-TRUE —
  a body that accurately cites its source doc's real pasted evidence is not a false claim, even if a
  later unrelated merge makes the absolute number stale.
- [CARD-022] Milestone parsing does NOT reuse `parse-card.ts`'s `extractSection` — milestone headings are
  dynamic (`## M1 — …`, em-dash + digits) and `extractSection` interpolates its heading arg UNESCAPED into
  a RegExp (the [CARD-019→CARD-020] latent trap). `milestones.ts` scans lines with fixed anchored patterns
  (`/^##\s+M\d+/` for a heading, `/^\s*\*\*Cards:\*\*/` for the card line, `/CARD-\d+/g` to extract ids) so
  no user/spec text is ever compiled into a regex. It also imports NO gray-matter and NO fs — pure over its
  string+cards inputs — keeping it the same dependency-free character as `card-model.ts`.
- [CARD-022] A fast-check arbitrary that feeds a parser must satisfy that parser's own accept pattern, or the
  property silently exercises nothing: a milestone-name arbitrary must match `parseMilestones`' heading regex
  `/^##\s+(M\d+.*)$/` (e.g. `"M1 — fixture"`, not `"M — fixture"` with no digit after `M`) — otherwise
  `parseMilestones` returns `[]` and `result[0]` is `undefined`, and the property passes vacuously. Caught here
  as "expected undefined to be defined", shrunk to `cardIds: []`. Generate inputs the code under test accepts.
- [CARD-022] A line-scanning parser over an **externally-authored** file (one this tool reads from an
  arbitrary target repo, not one it writes) must split on `/\r\n|\n/`, never a bare `'\n'`: a
  CRLF-checked-out file (git-for-Windows `core.autocrlf=true`) leaves a trailing `\r` on every line, and
  no anchored regex ending `$` matches it (`.` excludes `\r`; JS `$` without `m` won't match before it),
  so the parser silently returns `[]` with no error. `milestones.ts` shipped this bug (all fixtures were
  LF); the whole-branch review's functionality + tests lenses caught it, fixed in `ed03641`.
  `parse-card.ts`'s `extractSection` is only *accidentally* CRLF-safe (its trailing `\s*$` absorbs the
  `\r`) — don't rely on that accident; split on `/\r\n|\n/` explicitly.
- [CARD-022] A CRLF-vs-LF regression test must pin a **literal** hardcoded expected value, not only a
  differential compare (`parseX(crlf)` toEqual `parseX(lf)`): the differential alone passes vacuously if a
  bug degrades both sides to the same wrong value (e.g. `[]` on both). Assert the literal parsed array too.
- [CARD-006] A no-network test guard that spies `net.Socket.prototype.connect` must handle TWO calling
  shapes at that interception point (confirmed by direct reproduction, CARD-006 impl): (a) a **direct**
  `socket.connect(port, host)` / `socket.connect(options)` passes normal spread args — first arg is
  polymorphic (port number with host in arg 2 / IPC path string — a unix socket, allow / `{host,port,path}`
  object); BUT (b) `net.connect(...)`/`net.createConnection(...)` — **and undici's global `fetch`, which
  routes through them** — pre-normalize and call `Socket.prototype.connect` with a **SINGLE array argument**
  (`[options, callback, Symbol(normalizedArgs)]`), NOT spread. The spy must detect
  `args.length === 1 && Array.isArray(args[0])` and unwrap `args[0][0]` before reading host/port, or it
  silently reads an empty options object and never flags a real non-loopback (`fetch`) connection. Treat
  `undefined`/`''`/`localhost`/`127.0.0.1`/`::1`/`::ffff:127.0.0.1` as loopback; assert on the connection
  TARGET so a GitHub call is caught by remote address without real DNS/network. Design in ADR-0010/ADR-0011.
- [CARD-006] `http-server.ts`'s route dispatch reads `req.url` directly, never `req.url ?? ''` — Node's
  `IncomingMessage.url` is always populated in a real server request handler despite the optional TS type,
  so a `?? ''` fallback is dead code that permanently costs one uncovered branch against the 90% coverage
  target for no behavioral benefit.
- [CARD-006] Testing a `net.Socket.prototype.connect` spy's per-arg-SHAPE branches needs an explicit
  test per shape, not per outcome: `net.connect(port, host)` (the factory) and `fetch`/undici both
  normalize to the array-wrapped `[options,cb]` form before `Socket.prototype.connect`, so a test using
  either NEVER reaches the spy's `typeof first === 'number'` (direct `socket.connect(port, host)`) branch
  — it stays a surviving mutant, and `test/**` is outside coverage `include` so the gate won't flag it.
  Hit that branch directly with `new net.Socket().connect(port, host)`. And **fail closed**: a REQ-001
  guard that maps "no resolvable host" to loopback-allowed is fail-open (an options object with none of
  host/hostname/path silently passes) — classify shapes into allow/host/unrecognized and BLOCK
  unrecognized; every real caller (fetch/https) always sets host/hostname/path, so it costs nothing legit.
- [CARD-006] `index.ts`'s server binds `.listen(PORT, '127.0.0.1', cb)` (loopback), NOT `.listen(PORT, cb)`
  — the host-less form binds all interfaces (0.0.0.0/::), exposing the read-only board to the LAN while the
  log claims `http://localhost`. Tests bind `127.0.0.1`; production must match. A `--host` flag is CARD-018's.
- [CARD-006] When mutation-verifying a **fail-closed** branch's test coverage, mutate the branch's
  **body/return value** (make it return the permissive outcome), not just its **condition** (make it
  always fall through): the fail-closed catch-all can mask a condition-only mutant on a "blocks X" test
  that doesn't assert message content, so a condition mutant looks like it reddens fewer tests than the
  body mutant the implementer's claim actually describes. Match the mutation to the claim.
- [CARD-006] A PR-body self-fix for one `DLV-BODY-TRUE` finding can introduce a **new** one in the
  same edit — re-verify every clause the fix touches against the diff, not just the clause the prior
  finding named. Here the guard-wrap count (1 wrapped vs 5 not) was corrected accurately, but the
  added explanatory clause ("the other five inject a snapshot provider") overstated a mechanism true
  for only 1 of the 5: the other 4 omit `options.snapshot` and run the default `buildSnapshot(options)`
  path against a disposable `writeFixtureBoard()` tmp dir. Explanatory prose added while fixing is
  unchecked prose — it needs the same grep-against-the-diff the original claim needed.
- [CARD-027] `server.close(cb)` NEVER fires its callback while an SSE/streaming response is in flight:
  http's `close()` only closes connections "not sending a request or waiting for a response", and the
  `'close'` event is not emitted until all connections end — so a `withServer`-style
  `await new Promise(r => server.close(() => r()))` hangs the whole test file forever on one open
  stream. Fix is `server.closeAllConnections()` (Node >=18.2) **before** awaiting `close()`. It is NOT
  a no-op for ordinary request/response tests: it forcibly destroys the idle keep-alive socket undici
  still holds pooled — harmless only because each test binds a fresh `:0` port, so no later test reuses
  that origin. Conversely `keepAliveTimeout` (5 s) cannot truncate a stream — it is defined as
  inactivity *after the last response is written*.
- [CARD-027] A test that deep-equals a server payload against a directly-computed
  `buildSnapshot(options)` while pinning `now: FIXED` is **blind to whether the server evaluated the
  snapshot provider per request or cached it once at construction** — the fixed clock removes
  `generatedAt`, the only accidental discriminator. Any card asserting that a client receives a
  *current* (not replayed) snapshot must inject a call-varying provider
  (`let n = 0; () => ({ ...base, projectName: `p${++n}` })`) and assert successive callers see
  different values. Determinism and freshness need separate assertions; the deep-equal proves shape,
  not recomputation.
- [CARD-027] In vitest, prefer a module-level array of open resources swept by `afterEach` over relying
  on a helper's `finally` for teardown: a timed-out test's promise chain is no longer awaited by the
  runner, so a `finally` blocked on a never-settling await never runs. Also note per-wait timeout
  budgets **do not compose** — a test chaining N bounded waits can exceed vitest's 5 000 ms default
  `testTimeout` even though every individual wait is under it; give such a test an explicit `{ timeout }`.
