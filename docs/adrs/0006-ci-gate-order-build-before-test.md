---
id: ADR-0006
title: "CI gate order runs build before test (build gate feeds the test gate)"
status: Accepted
date: 2026-07-18
card: CARD-002
supersedes: [ADR-0004]
superseded_by: ""
---

# ADR-0006: CI gate order runs build before test (build gate feeds the test gate)

## Context

ADR-0004 fixed the CI gate order as `lint → typecheck → test → build`. During CARD-002
implementation, task 5's gate-isolation proof failed under that order: `test/packaging.test.ts`
(CARD-001, out of CARD-002's scope) shells out to `npm run build` via `execFileSync` (line 77) —
it builds and packs the project to verify the published tarball ships no test files. So the **test
gate transitively depends on a successful build**. With test before build, a build-only breakage
first goes red at the `test` step (surfacing as a confusing `Command failed: npm run build` inside a
vitest test), misattributing the failure and violating AC-3's requirement that each gate be
independently falsifiable.

Modifying CARD-001-owned test code was rejected by the driver; reordering the gates was chosen
instead — build-before-test is the correct topological order, since the test suite requires a built
project. ADR-0004 is immutable and its Decision text still reads `test → build`, which now
contradicts the shipped `.github/workflows/ci.yml`. This ADR supersedes ADR-0004 to keep the durable
decision record aligned with the shipped workflow (the code was correct; only the ADR text was
stale).

## Decision

Within the single `gates` job of `.github/workflows/ci.yml`, run steps in the order:

```
npm ci → npm run lint → npm run typecheck → npm run build → npm test
```

All other ADR-0004 substance is retained verbatim: one reusable workflow with
`on: [pull_request(branches: [main]), workflow_call]`, `permissions: contents: read`, `setup-node`
node 20 + `cache: npm`, and **no** `actions/cache` for `dist/` or `*.tsbuildinfo` (no build state is
cached). CARD-003 inherits this order via `uses: ./.github/workflows/ci.yml`. The `buildIndex <
testIndex` invariant is guarded by a mutation-verified assertion in `test/ci-workflow.test.ts`.

## Status

Accepted (supersedes ADR-0004)

## Consequences

Easier: a build breakage halts at the `build` step, so each gate independently attributes its own
failure and AC-3 holds; the corrected order lives in the durable ADR record rather than only in a
card's `implement.md`. A future "restore ADR-0004's original order" edit is a regression that the
contract test catches red before merge.

Harder / standing constraint: **build must precede test** is now a permanent constraint any future
gate reordering (CI or CARD-003's release) must respect, because the test suite builds the project.
Nothing else of substance changes — the reorder is internal to the single reusable workflow, so
CARD-003's `workflow_call` contract is unchanged.
