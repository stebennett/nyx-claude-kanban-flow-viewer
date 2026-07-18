## CARD-002 — design: Run lint, typecheck, tests and build on every pull request   [task · infra]

### Why

Give every pull request an automated pass/fail verdict on the four gates CARD-001 built (lint,
typecheck, test, build), so a regression is caught before review rather than after merge. It also
gives kanban-flow's own `card-deliver-checker` a real "CI not red" signal to read — until this
workflow exists, that check passes by absence.

### Design summary

- **One reusable workflow** `.github/workflows/ci.yml`, one `gates` job, four sequential named steps
  after `npm ci` — it runs CARD-001's existing npm scripts, reimplementing no gate.
- **`on: [pull_request(branches: main), workflow_call]`** — the same gate definition serves PR CI now
  and CARD-003's release later (via `uses:`), so the two gate lists cannot drift.
- **Honors CARD-001's hard-won constraints:** typecheck is `npm run typecheck` = `tsc -b --noEmit`
  (never raw `tsc` — ADR-0003's false green); CI caches **only** `~/.npm` and **no build state at all**,
  so the stale-`.tsbuildinfo` false green (a build gate green while building nothing) is structurally
  impossible in CI.
- **Each gate is independently falsifiable** by a gate-isolated seed proven to trip exactly one gate
  (e.g. an *exported* mistyped const stays lint-green — no type-aware lint rule — while going
  typecheck-red). A Vitest contract test pins the workflow's structure, including the no-build-state-cache
  rule, with literal-value assertions.

### Acceptance criteria (sharpened)

- **AC-1** — triggers on `pull_request` with `branches: [main]`, and is callable via `workflow_call`. (REQ-036)
- **AC-2** — a green run executes, in order, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` after `npm ci`. (REQ-036)
- **AC-3** — a PR with only a lint / type / test / build failure reports a red check at that gate; each independently falsifiable. (REQ-036)
- **AC-4** — install is `npm ci` against the committed lockfile; setup-node `cache: npm`; no `actions/cache` for `dist/` or `*.tsbuildinfo`. (REQ-036)

### ADRs in this PR

- **ADR-0004** — CI gates run as a single reusable workflow, with no build-state caching.

### Open questions / decisions deferred

None open. The design check passed with **no blocking findings** and two advisories (carried in
`design-check.md` in this diff): an unsanctioned `concurrency` block (idiomatic CI hygiene — keep or
drop), and design.md exceeding the ≤150-line advisory budget.

Note (carried from CARD-001, ADR-0003): `docs/spec.md` REQ-036 still names `tsc --noEmit`; the CI step
calls the `npm run typecheck` script (`tsc -b --noEmit`), so the ADR governs. The spec prose is slated
for a `/requirement` amendment.

Full design: `docs/cards/CARD-002-ci-pull-request-gates/design.md` (in this diff). Merging this PR
approves the design; the implementation branch is cut from main after merge and the workflow arrives as
a second PR.

🤖 Design delivered via /kanban
