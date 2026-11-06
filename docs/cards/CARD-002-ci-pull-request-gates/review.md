---
verdict: pass
review_lenses_failed: []
---

# CARD-002 — Review panel (full run, 8 lenses)

All eight lenses pass with no blocking findings. The build-before-test reorder was independently
verified correct by acceptance, design, functionality, and tests (each confirmed
`test/packaging.test.ts:77` shells out to `npm run build`, so build must precede test for AC-3's
per-step attribution). Three lenses (design, acceptance, readability) independently propose a
**superseding ADR-0006** to reconcile ADR-0004's now-stale step order — actioned by the orchestrator
(ADR-0006 supersedes ADR-0004). Advisories ride the PR.

## [acceptance]
### Blocking
None.
### Advisory
- AC-4-style note only. AC-1..AC-4 all met; AC-3 (each gate independently red) is MET by the reorder —
  Actions halts at the first failing step, so broken-build → red build step (test never reached),
  failing-test → red test step. The `buildIndex < testIndex` invariant is a mutation-verified committed
  assertion.
- design.md's AC-2 row and ADR-0004's Decision still show test-before-build — reconcile via the
  superseding ADR (below).

## [design]
### Blocking
None.
### Advisory
- `docs/adrs/0004-*.md` Decision text fixes the order as `test → build`, but the shipped `ci.yml` runs
  `build → test`. The deviation is correct and recorded in implement.md, but the ADR is the durable,
  discoverable record and now contradicts the code on a point its own Consequences reasons about.
  Fix (orchestrator, not implementer): a superseding ADR — **actioned as ADR-0006**.
- ADR-0004's substance (one reusable workflow, no build-state cache, `workflow_call` reuse) confirmed
  preserved; the no-build-state-cache invariant is machine-enforced by the contract test.

## [functionality]
### Blocking
None. All four gates wired correctly, each a blocking step (no `continue-on-error`/`if:`). Verified:
PR-to-main trigger, `workflow_call` reuse with no required inputs/secrets, `@v4` tags valid, concurrency
keying (no cross-cancel), `npm ci --dry-run` clean (lockfile in sync), js-yaml `on:` key not coerced to
boolean.
### Advisory
- `test/ci-workflow.test.ts` doesn't assert that no gate step carries `continue-on-error: true` (or a
  skipping `if:`) — the one machine-checkable false-green vector left open. No such flag exists today;
  a one-line assertion would close it. Worth adding when CARD-003 extends the workflow.

## [security]
### Blocking
None.
### Advisory
- `ci.yml` pins `actions/checkout@v4` / `actions/setup-node@v4` to a mutable major tag — acceptable
  here (job is `contents: read`, `pull_request` not `pull_request_target`, no secrets). **Flag forward
  to CARD-003:** SHA-pin these actions once they run under a release job with `NPM_TOKEN` + publish.
### Checked clean
Least-privilege `permissions: contents: read`; `pull_request` (fork PRs get no secrets); no injection
into any `run:`; `js-yaml` was already in main's lockfile (transitive) — only promoted to a direct
devDep, no new package; `npm ci` pins the lockfile; no secrets declared/echoed.

## [simplicity]
### Blocking
None. Diff is exactly the in-scope set + generated lockfile; one job, four gate steps, no matrix, no
fan-out. Test asserts one contract point per assertion, no incidental YAML shape.
### Advisory
- `ci.yml` `concurrency` block has no AC behind it (design-check already named it the one unsanctioned
  addition) — idiomatic, harmless CI hygiene; keep or trim, non-blocking.

## [tests]
### Blocking
None. The contract test asserts literal values off design.md's pre-written Interfaces (not
reverse-engineered from the impl); the reviewer independently re-ran the three named regressions
(raw `tsc --noEmit`, test-before-build, `actions/cache` for `*.tsbuildinfo`) and confirmed each goes
red. AC-3's seed-and-revert proofs match CARD-001's established gate-isolation convention.
### Advisory
- `workflow_call` is presence-checked only; no assertion guards a future `inputs:`/`secrets:` block
  widening CARD-003's contract. Advisory; add if the signature drifts.
- `concurrency` block has no assertion — a future edit could silently drop it.

## [readability]
### Blocking
None. `ci.yml` and the test are legible; the non-obvious build-before-test order is explained by an
inline comment on the step, mirrored on the test's ordering assertion, and guarded by a
mutation-verified test — the exact "don't let someone quietly un-fix this" guard.
### Advisory
- ADR-0004's Decision text still shows the old order — reconcile via the superseding ADR (actioned as
  ADR-0006).
- `CLAUDE.md` (repo root, outside this diff) still reads "there is no code ... yet" — stale after
  CARD-001/CARD-002. Edit-protected; flagged to the driver, no diff proposed.

## [typescript]
### Blocking
None. Only TS is `test/ci-workflow.test.ts`; typechecks clean under strict +
`noUncheckedIndexedAccess` + `verbatimModuleSyntax`. No `any`, no `!`, one justified `as` cast off
js-yaml's `unknown` `load()` return; a real type-predicate (`filter((run): run is string => ...)`)
instead of a cast. All indexed YAML access optional-chained/defaulted.
### Advisory
- The top-level `load(...) as Workflow` cast has no runtime shape check, and the first field read
  doesn't guard `workflow` being non-object — low risk (file authored in this PR; failure still reds
  the test). A `typeof workflow !== 'object'` guard would harden it.
