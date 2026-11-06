# CARD-003 — Publish npm package and GitHub Release on a vX.Y.Z tag — Design

## Intent
Make `npx kanban-flow-viewer` reachable by end users and turn cutting a version into a single
tag push. Pushing a `vX.Y.Z` tag runs a release workflow that reuses CARD-002's CI gates, then —
only if the tag matches `package.json`'s version — builds, publishes to npm with provenance, and
creates a GitHub Release. Because an npm publish is permanent (npm forbids republishing a
version), the version/tag guard and the gate wall are load-bearing (REQ-037, REQ-007).

## Acceptance criteria
1. **Trigger shape (REQ-037).** A `vX.Y.Z` tag push runs the workflow; other tag shapes
   (`v1`, `v1.2`, `v1.2.3-rc1`, `v1.2.3.4`, `latest`) do not. Enforced by the trigger glob
   `v[0-9]+.[0-9]+.[0-9]+`.
2. **Version guard (REQ-037).** A `vX.Y.Z` tag not equal to `v<package.json version>` fails the
   workflow and publishes nothing. Enforced by a guard step that `exit 1`s on mismatch, before build.
3. **Publish with provenance (REQ-037, REQ-007).** On match, the package builds and
   `npm publish --provenance --access public` runs, authenticated via `NODE_AUTH_TOKEN`.
4. **GitHub Release (REQ-037).** A Release is created for the tag with generated notes.
5. **Gate wall (REQ-037).** lint→typecheck→build→test run (via `uses: ./.github/workflows/ci.yml`)
   before publish; any gate failing fails the workflow and publishes nothing (publish `needs: gates`).

## In scope
- `.github/workflows/release.yml` (new): the release workflow (trigger, `gates` reuse, `publish` job).
- `test/release-workflow.test.ts` (new): a js-yaml contract test over release.yml + package.json.
- `package.json`: add `repository.url` (npm-provenance prerequisite).

## Out of scope (YAGNI)
- Creating the `NPM_TOKEN` repo secret or granting the App `Workflows: write` (manual prerequisites,
  no card can do them).
- Changing ci.yml, its gates, filename, job name, or order (a cross-card contract; reuse only).
- Version bumping / changelog generation / release-please style automation; multi-registry publish;
  pre-release / dist-tag channels; publishing on branch pushes.
- Any runtime `src/` code — this card adds no application logic.

## Dependencies & assumptions
- CARD-001 (build/publish layout, ADR-0002/0003) and CARD-002 (`.github/workflows/ci.yml` reusable
  workflow, ADR-0006) are merged on main — confirmed present.
- **Assumption (manual, out-of-band):** the `NPM_TOKEN` secret is configured on the repo, and the
  nyxhub-bot App has `Workflows: write` (KNOWLEDGE [CARD-002]) so the `.github/workflows/release.yml`
  push is accepted. The pointer states the App credential issue that blocked CARD-002 is now fixed.
- The maintainer bumps `package.json` `version` to `X.Y.Z` and commits it before tagging `vX.Y.Z`;
  the guard rejects a stale/un-bumped version.

## Approach
Two-job workflow. `gates` reuses ci.yml unchanged via `workflow_call`. `publish` (`needs: gates`)
checks out, sets up Node 20 with an npm `registry-url`, verifies the tag equals `package.json`'s
version, `npm ci`, builds, publishes with provenance, and cuts the Release. The guard is the *first*
publish step (after setup, before `npm ci`/build) so a mismatch fails cheaply and publishes nothing.

Alternatives considered:
- **Inline the gates in release.yml** (rejected): REQ-037 requires the *same* gates as REQ-036; a
  second copy drifts silently and makes REQ-037 false with no card's criteria failing (card Notes).
  `uses: ./.github/workflows/ci.yml` is the single-source contract (KNOWLEDGE [CARD-002]).
- **Separate fail-fast `verify` job that `gates` needs** (rejected for minimality): saves a wasted
  gate run on a typo'd tag, but adds a third job + extra checkout; `estimated_lines` 110 favors the
  two-job form. Guard-as-first-publish-step still yields "publishes nothing" on mismatch.
- **`@v4` moving action tags** (rejected): fine for the read-only PR gate (ci.yml), a real
  supply-chain exposure in a job holding NPM_TOKEN + a publish (KNOWLEDGE [CARD-002]). SHA-pin.

## Interfaces
`.github/workflows/release.yml`:
```yaml
name: Release
on: { push: { tags: ['v[0-9]+.[0-9]+.[0-9]+'] } }   # AC-1: only vX.Y.Z fires this
permissions: { contents: read }                      # least-privilege default
jobs:
  gates:
    uses: ./.github/workflows/ci.yml                 # AC-5: reuse REQ-036 gates verbatim
  publish:
    needs: gates                                     # AC-5: gates must pass before publish
    runs-on: ubuntu-latest
    permissions: { contents: write, id-token: write } # Release + provenance OIDC
    steps:
      - uses: actions/checkout@<40-hex-sha>          # e.g. # v4.2.2
      - uses: actions/setup-node@<40-hex-sha>        # e.g. # v4.1.0
        with: { node-version: '20', registry-url: 'https://registry.npmjs.org' }
      - name: Verify tag matches package.json version # AC-2
        env: { GITHUB_REF_NAME: ${{ github.ref_name }} }
        run: |
          VERSION="$(node -p "require('./package.json').version")"
          if [ "$GITHUB_REF_NAME" != "v${VERSION}" ]; then
            echo "Tag $GITHUB_REF_NAME != v${VERSION}" >&2; exit 1
          fi
      - run: npm ci
      - run: npm run build                           # AC-3 (ADR-0002 layout)
      - run: npm publish --provenance --access public # AC-3
        env: { NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }} }
      - name: Create GitHub Release                  # AC-4
        env: { GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
        run: gh release create "$GITHUB_REF_NAME" --generate-notes
```
SHA pins are placeholders in this doc only; the implementer resolves each with
`gh api /repos/actions/checkout/git/ref/tags/v4.2.2 --jq .object.sha` (recommended
checkout v4.2.2 `11bd71901bbe5b1630ceea73d27597364c9af683`; verify setup-node v4.1.0 likewise) and
writes `owner/repo@<40-hex> # vX.Y.Z`. The contract test enforces the SHA *shape*, not a fixed value.

`package.json`: add `"repository": { "type": "git", "url": "git+https://github.com/stebennett/nyx-claude-flow-viewer.git" }`.

## Data flow
`git push vX.Y.Z` → trigger glob accepts → `gates` (ci.yml: lint→typecheck→build→test) → on green,
`publish`: checkout → setup-node → version guard → npm ci → build → publish(provenance) → release.
A gate failure skips `publish` (nothing published); a guard mismatch fails `publish` before the
publish step (nothing published). No `src/` data flow — this is infra-as-code.

## Implementation task list
Each task: write the assertion(s), run the targeted file red, implement, run green, commit. Run the
targeted file with `npx vitest run test/release-workflow.test.ts` during cycles; run `npm run lint`,
`npm run typecheck`, and full `npm test` once before finishing.

1. **package.json `repository` for provenance.** Create `test/release-workflow.test.ts` with a top
   `readJson('package.json')` helper (mirror `test/packaging.test.ts`) and
   `it('declares a repository.url so npm provenance can link source')` asserting
   `String(pkg.repository.url)` contains `github.com` and `nyx-claude-flow-viewer`. Run → red. Add
   the `repository` field to package.json. Run → green. Commit.
2. **Trigger + gate reuse + ordering.** Load release.yml at module top via js-yaml `load` (mirror
   `test/ci-workflow.test.ts`; typed `Workflow` interface with `on.push.tags`, `jobs.<name>.uses`,
   `.needs`, `.permissions`, `.steps`). Add: `it('triggers only on vX.Y.Z tags')` →
   `expect(wf.on.push.tags).toStrictEqual(['v[0-9]+.[0-9]+.[0-9]+'])`, `expect(wf.on.push.branches)`
   undefined, `expect(wf.on).not.toHaveProperty('pull_request')`; `it('reuses the CI gates')` →
   `expect(wf.jobs.gates.uses).toBe('./.github/workflows/ci.yml')`; `it('gates precede publish')` →
   `expect(wf.jobs.publish.needs).toContain('gates')`. Run → red (file missing throws). Create
   release.yml with the `on`, top-level `permissions: contents: read`, `gates` job, and a `publish`
   job (`needs: gates`, one dummy `run`). Run → green. Commit.
3. **Version guard (AC-2).** Add `it('guards tag against package.json version')`: find a publish step
   whose `run` includes both `require('./package.json').version` and `exit 1`, and whose `env` or
   `run` references `github.ref_name`/`GITHUB_REF_NAME`. Run → red. Add the guard step (Interfaces).
   Run → green. Commit.
4. **SHA-pinned actions + registry auth.** Add `it('SHA-pins every third-party action with a version
   comment')`: for each step with `uses` not starting with `./`, assert it matches
   `/^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/`, and that its raw source line carries a trailing `# ` comment
   (regex over `rawText`); `it('sets up node 20 with the npm registry for auth')` →
   setup-node step `with['registry-url'] === 'https://registry.npmjs.org'` and
   `String(with['node-version']) === '20'`. Run → red. Add SHA-pinned checkout + setup-node steps.
   Run → green. Commit.
5. **Build + provenance publish + permissions.** Add `it('installs with npm ci, builds, then
   publishes with provenance')`: publish `run`s contain `npm ci` and `npm run build` and a step whose
   `run` matches `/npm publish/` and includes `--provenance`; that publish step's
   `env.NODE_AUTH_TOKEN === '${{ secrets.NPM_TOKEN }}'`; `it('grants least-privilege publish
   permissions')` → top-level `permissions.contents === 'read'`, `wf.jobs.publish.permissions` equals
   `{ contents: 'write', 'id-token': 'write' }`; `it('never installs with npm install')` → no publish
   `run` equals `npm install`/`npm i`. Run → red. Add `npm ci`, `npm run build`, the publish step, and
   the publish-job `permissions`. Run → green. Commit.
6. **GitHub Release + no non-blocking escape hatches.** Add `it('creates a GitHub Release with
   generated notes')`: a publish step `run` includes `gh release create` and `--generate-notes`, with
   `env.GITHUB_TOKEN` set; `it('has no gate-bypassing escape hatches')` → no step in any job has
   `continue-on-error === true`, `wf.jobs.gates` has no `if`, and no publish step has an `if`. Run →
   red. Add the release step. Run → green. Run `npm run lint && npm run typecheck && npm test`. Commit.

## Test strategy
Contract test over YAML + JSON (js-yaml `load`, `readFileSync`) — the CARD-002 `ci-workflow.test.ts`
pattern. No `src/` runtime code is added, so the 90% `src/server` coverage target (KNOWLEDGE
[CARD-001]) is untouched; lint + `tsc -b --noEmit` (the test file is a `*.test.ts`, auto-covered by
tsconfig.test.json's `**/*.test.ts` glob — no tsconfig edit) and full `npm test` must stay green.

Assertions are computed independently of release.yml's text: expected trigger glob, gate path, and
permission map are literals from this design, not read back from the file. Per-AC mutation coverage:
- AC-1 — flip the glob to `'v*'` or delete the `tags` filter → `toStrictEqual` fails.
- AC-2 — delete the guard step (or its `exit 1`) → the guard-step search finds nothing → fails.
- AC-3 — drop `--provenance`, or the publish step, or `id-token: write`, or `NODE_AUTH_TOKEN` → the
  matching assertion fails. (Provenance also fails at runtime without `repository.url`, guarded by task 1.)
- AC-4 — remove the release step or `--generate-notes` → fails.
- AC-5 — remove `needs: gates` or rename the `uses` target → `toContain('gates')` / `toBe` fails.
- Supply-chain — repin any action to `@v4` → the 40-hex-SHA regex fails.
- Non-blocking escape hatch — add `continue-on-error: true` or a skipping `if:` to a gate/publish
  step → the escape-hatch assertion fails (KNOWLEDGE [CARD-002] false-green guard).
No property tests (no numeric/invariant domain logic in this card).

## Spec references
- `docs/spec.md` REQ-037 — the release trigger, version match, provenance publish, Release notes,
  and same-gates-as-REQ-036 requirement.
- `docs/spec.md` REQ-007 — UI built at publish time (build must run before publish).
- ADR-0002 — build/publish layout (`npm run build`, `dist/`, `bin`, `files`).
- ADR-0003 — typecheck via `tsc -b --noEmit` (inherited through the reused ci.yml).
- ADR-0006 (supersedes ADR-0004) — CI gate order build-before-test; release inherits it via `uses:`.
- `.github/workflows/ci.yml` — the reusable `gates` workflow (filename/job/order are the contract).
- `test/ci-workflow.test.ts`, `test/packaging.test.ts` — patterns the new contract test mirrors.
- KNOWLEDGE [CARD-002] — gate reuse contract, SHA-pin requirement for secret-bearing jobs, the
  js-yaml `on`-key/`continue-on-error`/skipping-`if` false-green guard, App `Workflows: write` gate.

## Proposed ADRs
### Release on a vX.Y.Z tag: reuse CI gates, SHA-pinned actions, provenance publish
**Context.** REQ-037 makes a `vX.Y.Z` tag push the sole release trigger; an npm publish is permanent
(no republish of a version), and the publish job carries NPM_TOKEN + id-token, making it the repo's
only secret-bearing, supply-chain-exposed workflow. It consumes CARD-002's gate contract (ci.yml) and
CARD-001's build/publish layout (ADR-0002), so the trigger/auth/pinning model is expensive to reverse
and cross-cutting.

**Decision.** release.yml triggers only on `push: tags: ['v[0-9]+.[0-9]+.[0-9]+']`. A `gates` job
reuses the CI gates verbatim via `uses: ./.github/workflows/ci.yml`; a `publish` job runs
`needs: gates` (so any gate failure skips publish). publish verifies
`github.ref_name == v<package.json version>` (fail → nothing published), SHA-pins every third-party
action to a full commit SHA, authenticates via setup-node `registry-url` +
`NODE_AUTH_TOKEN=secrets.NPM_TOKEN`, runs `npm publish --provenance --access public`, and creates a
GitHub Release with `gh release create --generate-notes`. Least-privilege permissions: top-level
`contents: read`; publish job `contents: write` + `id-token: write`. package.json gains
`repository.url` (a provenance prerequisite).

**Consequences.** Easier: cutting a release is one `git tag vX.Y.Z && git push --tags`; gates can
never drift from PR CI; provenance gives consumers a verifiable attestation; a compromised action tag
can't reach the token. Harder: the version must be bumped in package.json before tagging (the guard
rejects a stale version); SHA pins need periodic manual bumps (documented in KNOWLEDGE); the
NPM_TOKEN secret and the App's Workflows:write permission are manual, out-of-band prerequisites no
card can create.
