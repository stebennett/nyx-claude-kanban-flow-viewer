## CARD-002 — Run lint, typecheck, tests and build on every pull request   [task · infra]

Implementation PR. The design PR (#6) merged; this carries the CI workflow plus its phase docs.

### Why

Every pull request now gets an automated verdict on the four gates CARD-001 built (lint, typecheck,
test, build), so a regression is caught before review. It also gives kanban-flow's own
`card-deliver-checker` a real "CI not red" signal — until this workflow existed, that check passed by
absence.

### What changed

- **`.github/workflows/ci.yml`** — one reusable workflow, `on: [pull_request(branches: [main]),
  workflow_call]`, `permissions: contents: read`, a single Node 20 ubuntu `gates` job. Steps:
  `npm ci → npm run lint → npm run typecheck → npm run build → npm test`.
- **`test/ci-workflow.test.ts`** — parses `ci.yml` with js-yaml and pins the contract with **literal**
  assertions: trigger + `workflow_call`, the ordered step list, `tsc -b --noEmit` (never raw
  `tsc --noEmit`), no `npm install`, `cache: npm` on node 20, **no `actions/cache`/build-state cache**,
  `permissions: contents: read`. Each assertion is mutation-verified.
- `js-yaml` + `@types/js-yaml` added as devDependencies (the contract test's parser).

### The one non-obvious decision: build runs *before* test

`test/packaging.test.ts` (from CARD-001) shells out to `npm run build` to verify the published tarball,
so the **test gate depends on the build gate**. The design originally ordered test→build; that would
make a build-only breakage surface as a red *test* step, misattributing the gate. This PR runs
**build before test** — the correct dependency order — so a broken build fails at the build step and
each gate stays independently falsifiable (AC-3). The `buildIndex < testIndex` invariant is guarded by
a mutation-verified assertion, and an inline comment explains it so no one "fixes" it back.

**ADR change:** this reorder means **ADR-0006 supersedes ADR-0004** (which stated the old order). Both
are in this diff; ADR-0004 is marked Superseded. ADR-0004's substance (one reusable workflow, no
build-state caching, `workflow_call` reuse) is carried forward unchanged.

### Acceptance criteria

- [x] A workflow triggers on `pull_request` targeting main (and is `workflow_call`-reusable) (REQ-036)
- [x] It runs lint, typecheck, build, test as gates after `npm ci` (REQ-036)
- [x] A PR with only a lint / type / test / broken-build error reports a red check at that gate (REQ-036)
- [x] Install is `npm ci` against the committed lockfile; no build-state caching (REQ-036)

### Testing

All gates green on a clean tree: lint 0, typecheck 0, build 0, **18/18 tests**, 100% coverage on the
core-logic layer. Each of the four gates was proven to go red independently via gate-isolation seeds
(recorded in `implement.md`); the three named regressions (raw `tsc --noEmit`, test-before-build,
`actions/cache` for `*.tsbuildinfo`) were independently re-verified red by the test lens.

### Review

Full 8-lens panel, **no blocking findings**. Multiple lenses verified the build-before-test reorder is
correct (not just documented) and independently proposed the superseding ADR-0006, which is included.
Advisories carried in `review.md`: add a `continue-on-error` guard to the contract test (a residual
false-green vector); SHA-pin actions when CARD-003 adds secrets; the `concurrency` block is unsanctioned
but harmless. `CLAUDE.md` is noted stale (edit-protected).

### Knowledge

`KNOWLEDGE.md` gained: the packaging-test build/test coupling and its gate-order consequence; js-yaml's
`on:`-key handling; the CARD-003 SHA-pin note. ADR-0006 (build-before-test) supersedes ADR-0004.

🤖 Card delivered via /kanban
