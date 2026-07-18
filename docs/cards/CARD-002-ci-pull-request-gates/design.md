# CARD-002 — Design: Run lint, typecheck, tests and build on every pull request

## Intent
Give every pull request an automated pass/fail verdict on the four gates CARD-001 built
(lint, typecheck, test, build), so a regression is caught before review, and give
kanban-flow's own `card-deliver-checker` a real "CI not red" signal to read (until this
workflow exists that check passes by absence — see card Why). This card wires CI around the
existing npm scripts; it does not reimplement any gate. It also fixes the reusable-workflow
boundary that CARD-003's release workflow will call, without building CARD-003's release job.

## Acceptance criteria
Sharpened into observables. "Red check" = the workflow run and its PR check conclude `failure`.

| # | Observable | Spec |
|---|---|---|
| AC-1 | The workflow triggers on `pull_request` with `branches: [main]`; a PR targeting main starts a run, and (via `workflow_call`) it is also callable by another workflow. | REQ-036 |
| AC-2 | A green run executes, in order, `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` as distinct steps, after `npm ci`. | REQ-036 |
| AC-3 | A PR that introduces **only** a lint error → run red at the lint step; **only** a type error → red at typecheck; **only** a failing test → red at test; **only** a broken build → red at build. Each gate is independently falsifiable. | REQ-036 |
| AC-4 | The install step is `npm ci` (not `npm install`) against the committed `package-lock.json`; setup-node uses `cache: npm` and there is **no** `actions/cache` step for `dist/` or `*.tsbuildinfo`. | REQ-036 |

## In scope
- One new file: `.github/workflows/ci.yml` (the whole card).
- One new test: `test/ci-workflow.test.ts` pinning the workflow's structural contract.
- `js-yaml` + `@types/js-yaml` added as **devDependencies** (parser for the contract test).

## Out of scope
- Marking the check "required" for merge — repo branch-protection config, not workflow code (card Notes).
- CARD-003's release job (`release.yml`, tag trigger, npm publish, provenance, GitHub Release, NPM_TOKEN).
- Enforcing the 90% coverage threshold in CI (`test:coverage`): REQ-036's four gates are lint/typecheck/
  test/build; the test gate is `npm test` (= `vitest run`). Coverage stays a local dial (CARD-001) — a
  deliberate non-inclusion, not an omission. This card adds no `src/server` logic, so 90% holds unchanged.
- A Node version matrix, Windows/macOS runners, SHA-pinned actions, workflow-level caching of node_modules.

## Dependencies & assumptions
- `depends_on: [CARD-001]` (merged into this worktree): the four npm scripts, `package-lock.json`,
  tsconfigs and `index.html` exist and pass locally. CI runs them; it does not change them.
- Runner: `ubuntu-latest`, Node 20 (ADR-0001 `engines.node >= 20`; 20 is the compatibility floor — if
  gates pass on the floor they pass above). Actions pinned to major tags (`@v4`).
- Assumes the repo's Actions are enabled and PRs target `main` (the only long-lived branch).
- CARD-003 will `uses: ./.github/workflows/ci.yml`; the filename and its `workflow_call` trigger are a
  cross-card contract — this card fixes them, CARD-003 consumes them.

## Approach
A single reusable workflow, one job, four sequential gate steps. `on: [pull_request(branches: main),
workflow_call]` means the *same* gate definition serves both PR CI now and CARD-003's release later, so
the two gate lists cannot drift (that drift would make REQ-037's "same gates" silently false). One job
(not four) avoids paying `checkout`+`npm ci` four times; each gate is a named step so the failing gate
is obvious in the run UI.

**Caching (binding).** Install is `npm ci` against the committed lockfile. The **only** cache is
`actions/setup-node`'s `cache: npm` (the `~/.npm` download cache, keyed on `package-lock.json`) — it does
**not** cache `node_modules`, `dist/`, or `*.tsbuildinfo`. Per CARD-001's KNOWLEDGE gotcha and ADR-0003,
caching `*.tsbuildinfo` without also caching `dist/` makes `tsc -b` trust a stale buildinfo and no-op to a
false green; the safe choice taken here is to cache **no build state at all**. `build:server` already
carries `--force` (belt); the absent build-state cache is the suspenders. The typecheck gate is the
`npm run typecheck` script (`tsc -b --noEmit`), never raw `tsc` — the CI step calls the script, so ADR-0003
is honoured by construction.

### Alternatives considered
1. **A job per gate (fan-out).** Rejected: four `checkout`+`npm ci` installs for four one-line commands;
   4x minutes and 4x cold installs for no isolation the seeds don't already give.
2. **Duplicate the four gate commands inline in CARD-003's release.yml.** Rejected here on CARD-003's
   behalf: two gate lists drift; `workflow_call` reuse keeps one source of truth (this is why AC-1 adds
   the `workflow_call` trigger now).
3. **Node version matrix (20 + 22).** Rejected (YAGNI): the spec requires no matrix; the floor (20) is the
   compatibility contract. Extension point noted for later hardening.
4. **A composite/local action wrapping the gates.** Rejected: heavier than a reusable workflow for one
   linear job, and `workflow_call` is the idiomatic reuse unit GitHub gives us.

## Interfaces
The workflow's public contract (`.github/workflows/ci.yml`):
```yaml
name: CI
on:
  pull_request:
    branches: [main]
  workflow_call:        # CARD-003 release.yml: jobs.gates.uses: ./.github/workflows/ci.yml
permissions:
  contents: read
concurrency:            # cancel superseded runs of the SAME ref; keyed so PR/tag runs never cross-cancel
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
jobs:
  gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck   # tsc -b --noEmit (ADR-0003) — via the script, never raw tsc
      - run: npm test            # vitest run
      - run: npm run build       # vite build + tsc -b tsconfig.server.json --force
```
Reusable-workflow signature: no `inputs`, no `secrets` (the four gates need none). CARD-003 calls it with a
bare `uses:` and layers its own publish job + permissions on top.

## Data flow
No runtime/product data flow. The flow this card creates is the CI verdict pipeline:
```
PR opened/updated → ci.yml (gates job) → checkout → setup-node(cache:npm) → npm ci
    → lint → typecheck → test → build ─ any step non-zero ⇒ job failure ⇒ red PR check
                                        all zero ⇒ green ⇒ card-deliver-checker reads "CI not red"
```
No schema, no migration, no persistence. The only durable contract is the workflow filename +
`workflow_call` signature, consumed by CARD-003.

## Implementation task list
Each task is one red→green→commit cycle. Paste real command/step output as evidence.

1. **RED→GREEN: the workflow contract test.** Add `js-yaml` + `@types/js-yaml` to devDependencies, run
   `npm install`, commit the lockfile. Write `test/ci-workflow.test.ts` first (assertions in Test
   strategy) → RED (`ci.yml` absent). Create `.github/workflows/ci.yml` exactly as the Interfaces
   skeleton. Run `npm test` → GREEN. **Mutation checks (revert each):** change `npm ci` to `npm install`
   → RED; drop the `workflow_call` key → RED; change the typecheck step to raw `tsc --noEmit` → RED; add
   an `actions/cache` step keyed on `*.tsbuildinfo` → RED; change `branches: [main]` to `[develop]` → RED.
   **Commit.**
2. **Prove lint goes red (seed, run, revert).** On clean tree add an unused local
   `const _seed = 1;` to `src/server/paths.ts`; run `npm run lint` → non-zero at the lint rule; run
   `npm run typecheck` → still 0 (base tsconfig has no `noUnusedLocals`; eslint is `recommended`, not
   type-checked). Revert. Record both outputs in `implement.md`. **(No code commit — evidence only.)**
3. **Prove typecheck goes red.** Add `export const seedTypeError: number = 'x';` to `src/server/paths.ts`
   (exported → `no-unused-vars` stays silent → `npm run lint` = 0; `npm run typecheck` → non-zero). Revert.
   Record outputs.
4. **Prove test goes red.** Add `test/seed.test.ts` with `import { test, expect } from 'vitest'; test('seed',
   () => { expect(2).toBe(3); });`; `npm run lint` = 0, `npm run typecheck` = 0, `npm test` → non-zero.
   Delete the file. Record outputs.
5. **Prove build goes red.** Change `index.html`'s `<script … src="/src/ui/main.tsx">` to
   `src="/src/ui/missing.tsx"`; `npm run lint`/`typecheck`/`test` = 0 (none read index.html), `npm run
   build` → non-zero at `vite build`. Revert. (Fallback if index.html proves fragile: add
   `import './missing.css';` to `src/ui/main.tsx` — tsc allows it via vite/client's ambient `*.css`, vite
   build fails to resolve.) Record outputs.
6. **Green end-to-end sanity, locally.** On the clean tree run `npm ci && npm run lint && npm run typecheck
   && npm test && npm run build` → all 0. This mirrors what the workflow runs; the real GitHub run is
   observed at deliver via `gh pr checks`. **Commit** any final touch-ups. Record the run.

## Test strategy
Two proof layers; nothing here restates the workflow's own commands as its expected value.

**`test/ci-workflow.test.ts`** — parses `.github/workflows/ci.yml` with `js-yaml` (a real structural
contract, and the only place the binding no-build-state-cache rule is machine-checkable). Asserts literal
values, not mere key presence (per CARD-001 KNOWLEDGE):
- `on.pull_request.branches` deep-equals `['main']`; `on` has a `workflow_call` key (AC-1).
- The `gates` job's step `run` list, in order, contains `npm ci`, then `npm run lint`, `npm run typecheck`,
  `npm test`, `npm run build` (AC-2). Assert `npm run typecheck` is present and the string `tsc --noEmit`
  is **absent** from every step (guards ADR-0003 against a raw-tsc regression).
- The install step is exactly `npm ci` — assert no step runs `npm install` / `npm i` (AC-4).
- `setup-node` step `with.cache === 'npm'` and `with.node-version` is `'20'`.
- **No build-state cache:** no step `uses` contains `actions/cache`, and the raw file text matches neither
  `/tsbuildinfo/` nor `/path:\s*dist/` (AC-4, the binding constraint).
- `permissions.contents === 'read'`.

**Seed-and-run gate proofs (tasks 2–5)** — the primary evidence each gate is real, run against the exact
npm scripts CI runs, each seed isolated to one gate (proven green on the other three). These need no
GitHub; the workflow only forwards these commands, so a red command ⇒ a red step.

**Mutation per acceptance criterion** (a test that survives its mutation is not a test):
| AC | Mutation | What must go red |
|---|---|---|
| AC-1 | Drop `workflow_call`; set `branches: [develop]` | `ci-workflow.test.ts` red (each) |
| AC-2 | Remove the `npm run build` step; swap typecheck to raw `tsc --noEmit` | `ci-workflow.test.ts` red (each) |
| AC-3 | Each task 2–5 seed | the matching `npm run <gate>` exits non-zero while the other three stay 0 |
| AC-4 | `npm ci` → `npm install`; add an `actions/cache` for `*.tsbuildinfo` | `ci-workflow.test.ts` red (each) |

**Gates that must pass:** `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
locally, and — observed at deliver, not by a phase agent — a green `ci.yml` run on the implementation PR.
Coverage is unaffected (no new `src/server` logic; `test/ci-workflow.test.ts` is test code, not measured
source). No network in tests (the contract test reads a local file). Determinism: parsing a committed
YAML file is pure.

## Spec references
Downstream phases need only these:
- **REQ-036** (Continuous integration and release — Every pull request runs lint, typecheck, tests and
  build): the four gates and the red-on-failure requirement this card wires to CI. Note: REQ-036's prose
  names `tsc --noEmit`; the actual gate is `npm run typecheck` = `tsc -b --noEmit` per **ADR-0003** (the
  prose is slated for a `/requirement` amendment, ADR-0003 follow-up) — the CI step calls the npm script,
  so the ADR governs.
- **REQ-037** (boundary only): read solely for "the release workflow runs the same gates as REQ-036" —
  the reason AC-1 adds `workflow_call` now. CARD-003 owns REQ-037's release job.
- **ADR-0001** (Node 20+), **ADR-0002** (build layout: `npm run build` = vite + tsc, ordered),
  **ADR-0003** (typecheck = `tsc -b --noEmit` via the npm script) — all binding on the workflow.

## Proposed ADRs

### CI gates run as a single reusable workflow, with no build-state caching
**Context.** REQ-036 needs lint/typecheck/test/build on every PR; REQ-037 (CARD-003) requires the *same*
gates before an irreversible npm publish. Two gate lists in two files drift, and REQ-037's "same gates"
becomes silently false with no card's criteria failing. Separately, CARD-001 established (ADR-0003 + a
KNOWLEDGE gotcha) that `tsc -b` trusts a stale `*.tsbuildinfo` and no-ops to a false green, so any CI cache
of build state without also caching `dist/` turns the build gate green while building nothing. Both are
cross-cutting and expensive to reverse once CARD-003 stands on the boundary.
**Decision.** One workflow `.github/workflows/ci.yml` with `on: [pull_request(branches: [main]),
workflow_call]` and one `gates` job: `actions/checkout@v4` → `actions/setup-node@v4` (node 20, `cache:
npm`) → `npm ci` → `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`, as sequential named
steps. `permissions: contents: read`. CARD-003 reuses the gates via `uses: ./.github/workflows/ci.yml`
(no inputs, no secrets). CI caches **only** the `~/.npm` download cache (setup-node); it adds **no**
`actions/cache` for `dist/` or `*.tsbuildinfo` — no build state is cached at all. Node is a single version
20 (the `engines` floor), not a matrix.
**Consequences.** Easier: one authoritative gate definition that PR CI and the release both consume, so
they cannot drift; the stale-tsbuildinfo false green is structurally impossible in CI; least-privilege
permissions. Harder: a single job short-circuits later gates when an early gate fails, so each gate's
independent red is proven by gate-isolated seeds, not one run; CARD-003 inherits the `workflow_call`
signature (adding a matrix or splitting jobs later is a breaking change to that contract); no node_modules
cache warmth (acceptable — `npm ci` from a warm `~/.npm` is fast).
**Supersedes:** none.
