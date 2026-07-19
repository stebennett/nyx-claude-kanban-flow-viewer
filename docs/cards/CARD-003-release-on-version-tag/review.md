---
verdict: fail
review_lenses_failed: [tests]
---

# CARD-003 — Review panel

_7 lenses clean (advisories only). The [tests] lens re-run (after rework #1) confirmed both prior fixes but found a NEW blocking gap: the Release step is not asserted to target the pushed tag (AC-4 half-tested). Verdict: fail → rework #2._

## [acceptance]

### Blocking
None. Every acceptance criterion in design.md traces to a falsifiable test:
- AC-1 → `triggers only on vX.Y.Z tags` (toStrictEqual on the glob; rejects branches/pull_request).
- AC-2 → `guards tag against package.json version` (guard step with `exit 1` + ref_name).
- AC-3 → `installs with npm ci, builds, then publishes with provenance` + `grants least-privilege
  publish permissions` (id-token: write) + the `repository.url` provenance test.
- AC-4 → `creates a GitHub Release with generated notes`.
- AC-5 → `reuses the CI gates` + `gates precede publish` + `has no gate-bypassing escape hatches`.
Verified the reuse target: origin/main:.github/workflows/ci.yml has `workflow_call:` and the
lint→typecheck→build→test gates, so `uses: ./.github/workflows/ci.yml` resolves. Scope is exact —
the diff is only release.yml, test/release-workflow.test.ts, and package.json's `repository`;
no src/ and no ci.yml change, matching design.md's in-scope/out-of-scope lists.

### Advisory
- implement.md:22-24 — "Deviations from design: None … matches the Interfaces block verbatim" is
  slightly inaccurate: release.yml:40 adds `GITHUB_REF_NAME: ${{ github.ref_name }}` to the
  "Create GitHub Release" step's env, a line absent from the design's Interfaces block.
  Consequence: negligible — `GITHUB_REF_NAME` is a built-in runner env var, so both the guard
  step's and the release step's explicit re-export are redundant, not load-bearing. Fix: record it
  in the deviation section (or drop the redundant env line); the deviation audit should reflect reality.
- test/release-workflow.test.ts:76-94 — the AC-2 guard test finds the guard step anywhere in the
  publish steps array; it does not assert the guard precedes the publish step. The code orders it
  correctly (guard is the first publish step, before npm ci/build/publish), so "publishes nothing on
  mismatch" holds today, but a future reorder that moved the guard after `npm publish` would keep
  this test green. This is a tests-lane refinement; noted for [tests], not blocking.

## [design]

### Blocking
None.

### Advisory
- `.github/workflows/release.yml:38` — `gh release create` runs *after* `npm publish`
  (release.yml:36), so the irreversible step precedes the recoverable one. This ordering is
  correct by design (the Release documents the already-published artifact, and per data-flow in
  design.md:100-103), but the failure mode is worth recording for operators: if the Release step
  fails (e.g. the App still lacks the effective write scope KNOWLEDGE [CARD-002] flags as a manual
  prerequisite), npm is already published permanently and the GitHub Release must be created by
  hand. No code change wanted — noting the operational consequence for the human at the gate.

### Checked and clean
- Placement: release.yml, the `repository` field, and `test/release-workflow.test.ts` all sit in
  their conventional homes; the test mirrors the established `test/ci-workflow.test.ts` /
  `test/packaging.test.ts` pattern — consistency over preference.
- Drift/single-source: `gates` reuses ci.yml via `uses: ./.github/workflows/ci.yml` (release.yml:9)
  rather than duplicating gate logic; ci.yml is unchanged on this branch and present on main, so
  the gate list cannot silently drift (the inline alternative was weighed and rejected, design.md:51-53).
- No speculative abstraction: the four YAGNI exclusions (version bump, changelog, multi-registry,
  dist-tags) are honored — no one-implementation abstraction introduced.
- Fidelity: the diff matches design.md's `## Interfaces` block, including guard-as-first-publish-step
  (design.md:47-48), resolved SHA pins, and the least-privilege permission split
  (top-level `contents: read`, publish `contents: write` + `id-token: write`).
- No misplaced logic: no business/domain logic in this card; the version guard belongs in the
  workflow and is correctly homed there.

Notable good thing: reusing ci.yml via `workflow_call` instead of copying the gate list is exactly
the right call — it makes "the same gates as REQ-036" (design.md AC-5) a structural guarantee, not
a thing a future edit can quietly break.

## [security]

Scope: `.github/workflows/release.yml`, `package.json`, `test/release-workflow.test.ts`. A
tag-triggered publish workflow holding `NPM_TOKEN` + `id-token: write` is the repo's most
security-sensitive surface. Reviewed against the security Walk (secrets, supply chain, injection,
least privilege). No blocking findings.

### Blocking
- None.

### Advisory
- `.github/workflows/release.yml:17` — `actions/checkout` runs with its default
  `persist-credentials: true`, which writes the job `GITHUB_TOKEN` into the runner's git config.
  Nothing in the publish job does `git push` (build, `npm ci`, `npm publish`, and
  `gh release create` all use env-based auth, not git), so the persisted credential is unused
  surface. Because `npm ci` (step at :31) executes dependency lifecycle scripts in this same
  `contents: write` job, a compromised dependency could reach that persisted token → set
  `persist-credentials: false` on the checkout step. Defence-in-depth, not a live break —
  advisory, not blocking.

### Checked and clean (verified, not skimmed)
- SHA pins are correct and official: `checkout@11bd719…` = v4.2.2, `setup-node@39370e3…` = v4.1.0,
  resolved live against the tag refs — exact matches, no typosquat, no mutable `@v4` tag. The
  contract test also enforces the 40-hex shape + version comment.
- No script-injection surface: `github.ref_name` is the only external-influenced value, shape-
  constrained by the trigger glob; both consumers pass it through an `env:` block and reference the
  quoted shell var `"$GITHUB_REF_NAME"`, never `${{ github.ref_name }}` interpolated into a `run:` body.
- Least-privilege permissions: top-level `contents: read`; `publish` job scoped to `contents: write`
  + `id-token: write` only; `gates` (reusable ci.yml) inherits read-only. Enforced by toStrictEqual.
- Secret scoping: `NPM_TOKEN`→`NODE_AUTH_TOKEN` only on the publish step; `GITHUB_TOKEN` only on the
  release step; `gates` gets no secrets (no `secrets: inherit`).
- Gate wall integrity: `publish: needs: gates`, no `if:`/`continue-on-error`; the version guard is
  the first publish step, so a stale-version tag fails cheaply and publishes nothing.
- package.json: added `repository.url` only; no dependency changes.

## [simplicity]
Map pass over the full diff plus `design.md`, then a line pass through the simplicity Walk.
Diff-size audit: only the files `design.md` names — no drive-by scope.

**Good:** release.yml is a lean 41-line two-job workflow matching the design's `## Interfaces`
block almost verbatim — gate reuse via one `uses:` line, no registry/strategy indirection.

### Blocking
(none)

### Advisory
- `.github/workflows/release.yml:41` — the release step's `env: { GITHUB_REF_NAME: ... }` restates
  a value GitHub Actions already injects as a default env var for every step; harmless, and not in
  `design.md`'s interface for this step (though `implement.md` claims zero deviations). The boring
  version drops it. The guard step's identical mapping at line 24 is design-directed and fine.
- `test/release-workflow.test.ts:7-13` — `repoRoot`/`readJson` duplicate `test/packaging.test.ts`'s
  helper verbatim (per design's "mirror" instruction); fine at two copies, extract to a shared
  helper if a third contract-test file needs it.
- `test/release-workflow.test.ts:87-93` — `referencesRefName` accepts three reference forms, but
  the real guard step only ever uses one; the other two branches are untested generality.

## [functionality]

### Blocking
None. Every acceptance criterion traces to a correct, fail-closed code path; the diff matches
the checked design's `## Interfaces` verbatim.

### Advisory
- `.github/workflows/release.yml:34-40` — the `publish` job runs `npm publish` (permanent, non-
  republishable on npm) **before** `gh release create`. If the Release step fails after a
  successful publish, npm has the version but the repo has no Release, and the tag cannot be
  re-published to retry. Manually recoverable (`gh release create "$GITHUB_REF_NAME"
  --generate-notes` against the existing tag), so low-severity — but the ordering places the
  irreversible action first. Design AC-4 does not mandate the order; implementation choice, not a
  spec deviation.

### Checked and clean
- AC-1 glob hand-evaluated against GitHub filter-pattern rules: `v1`/`v1.2`/`v1.2.3-rc1`/`v1.2.3.4`/
  `latest` all rejected; `v1.2.3`/`v10.20.30` accepted.
- AC-2 guard is first publish step, uses `node -p` (no node_modules), `exit 1`s on mismatch under
  `bash -eo pipefail`; version is `0.0.0` so any real tag demands a bump. Fails closed.
- AC-3 build precedes publish; no prepack/prepublishOnly re-run; provenance prereqs present.
- AC-4 Release step has `contents: write` + `GITHUB_TOKEN`; tag exists (it triggered the run).
- AC-5 `publish: needs: gates`; `gates: uses ./.github/workflows/ci.yml` (workflow_call + contents:
  read confirmed). Gate failure skips publish.

## [typescript]
### Blocking
(none)

### Advisory
(none)

**Checked and found clean:**
- Every cast in `test/release-workflow.test.ts` (`JSON.parse(...) as Record<string, unknown>`,
  the `readJson('package.json') as {...}` re-cast, `load(rawText) as Workflow`, `step.uses as string`)
  mirrors the pattern already in `test/ci-workflow.test.ts` and `test/packaging.test.ts` —
  established convention, not new risk. No `any`, no non-null `!`.
- `step.uses as string` (line 106) sits inside a nested `.find()` closure after an outer-scope
  guard; TS narrowing doesn't cross function boundaries, so the assertion is load-bearing.
- Ran `npx tsc -b --noEmit` directly: `TypeScript: No errors found`.
- No React/hooks/data-flow/design-token/build-hygiene surface in this diff.

Non-blocking note (not filed): `loadWorkflow()` re-parses `release.yml` inside every one of the 11
`it()` blocks rather than once at module scope, unlike `test/ci-workflow.test.ts`.

## [readability]

### Blocking
(none)

### Advisory
- `.github/workflows/release.yml:23-24,39-40` — both the version-guard step and the GitHub Release
  step explicitly re-declare `env: GITHUB_REF_NAME: ${{ github.ref_name }}`, but `GITHUB_REF_NAME`
  is already a GitHub Actions default environment variable available to every step without an
  `env:` block. A future maintainer may read the redeclaration as load-bearing and copy the pattern
  somewhere it isn't. Fix: drop the redundant `env:` entries, or add a one-line comment if deliberate.
- `test/release-workflow.test.ts:96-110,168-180` — the SHA-pin test and the
  gate-bypassing-escape-hatch test enforce non-obvious supply-chain/false-green rules (ADR-0007,
  KNOWLEDGE [CARD-002]) with no inline comment, breaking the convention set by
  `test/ci-workflow.test.ts:57` (`// ADR-0003: …`) of citing the rationale at the assertion. Fix:
  add a one-line `// ADR-0007: …` / `// KNOWLEDGE [CARD-002]: …` comment at each.

Checked and clean: identifier naming across release.yml and the test file; consistency with
ci-workflow.test.ts/packaging.test.ts's helper and interface shapes; implement.md/test.md accuracy
against the diff; package.json repository.url correctness against the actual remote name.

Notable good: the new contract test mirrors the existing ci-workflow.test.ts/packaging.test.ts
pattern closely enough to read as one system, not a bolted-on one-off.

## [tests]

Re-run scope: whole `test/release-workflow.test.ts` (13 tests), verifying both prior rework
fixes plus a fresh whole-file pass.

### Blocking
- `test/release-workflow.test.ts:194-199` — the `creates a GitHub Release with generated notes`
  test only checks the release step's `run` contains `'gh release create'` and `'--generate-notes'`,
  and that `env.GITHUB_TOKEN` matches the secrets literal — it never verifies the release targets the
  pushed tag. Verified by mutation: rewriting the release step's `run` in a scratch copy of release.yml
  to `gh release create "v0.0.0-wrong" --generate-notes` (a hardcoded, wrong tag) still passes all 13
  tests. AC-4 requires a Release "for the tag" — this half of the criterion has no discriminating
  assertion, so a regression that hardcodes or drops the tag argument would ship silently. Fix: assert
  the release step's `run` (or `env`) references `GITHUB_REF_NAME`/`github.ref_name`, mirroring the
  guard test's env-or-run check, e.g. `expect(releaseStep?.run).toContain('$GITHUB_REF_NAME')`.

### Advisory
(none beyond what's already applied — the GITHUB_TOKEN tightening from review #1 is present and correct.)

### Verified from review #1 (confirmed resolved, not just re-read)
- Guard operator direction (test.ts:99): flipping `!=`→`==` in a scratch release.yml broke the test.
  Genuinely fixed.
- Publish step order (test.ts:140-166): moving `npm run build` after the publish step in a scratch
  release.yml broke the new order test (`expected 5 to be less than 4`). Genuinely fixed.
- Both mutations run against a scratch copy of the real file, then reverted; tree clean, 13/13 green.

### Notable good
The `orders the publish job steps` test's own comment names the exact bug class it exists to catch
(publish-before-build shipping stale dist/) — a review-legible test, not just a passing one.

