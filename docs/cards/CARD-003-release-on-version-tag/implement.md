# CARD-003 — Implement

## What changed
- Added `.github/workflows/release.yml`: a two-job workflow (`gates` reusing
  `./.github/workflows/ci.yml` via `workflow_call`; `publish`, `needs: gates`) that triggers only
  on `push: tags: ['v[0-9]+.[0-9]+.[0-9]+']` (AC-1).
- `publish` job: SHA-pinned `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2`
  and `actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0` (node 20,
  `registry-url: https://registry.npmjs.org`); a version-guard step (first, after
  checkout/setup-node) that `exit 1`s if `github.ref_name != v<package.json version>` (AC-2);
  `npm ci` → `npm run build` → `npm publish --provenance --access public`
  (`NODE_AUTH_TOKEN: secrets.NPM_TOKEN`) (AC-3); `gh release create "$GITHUB_REF_NAME"
  --generate-notes` (`GITHUB_TOKEN: secrets.GITHUB_TOKEN`) (AC-4). Least-privilege permissions:
  top-level `contents: read`; `publish` job `contents: write` + `id-token: write` (AC-5).
- Added `package.json` `repository.url` (`git+https://github.com/stebennett/nyx-claude-flow-viewer.git`)
  — a hard `npm publish --provenance` prerequisite.
- Added `test/release-workflow.test.ts` (13 tests, js-yaml + JSON contract test mirroring
  `test/ci-workflow.test.ts`/`test/packaging.test.ts`): asserts every AC plus the two false-green
  guards from KNOWLEDGE [CARD-002] (SHA-pin shape on every non-local `uses:`; no
  `continue-on-error: true` or skipping `if:` on any gate/publish step).

## Rework (review #1 — tests lens)
Addressed both tests-lens blocking findings from review.md (verdict: fail):
- **Finding 1 (guard operator direction unpinned):** the `guards tag against package.json version`
  test previously only asserted `run` contains `require('./package.json').version`, `exit 1`, and a
  ref-name reference — an inverted `==` would still pass while blocking every valid release. Added
  `expect(guardStep?.run).toContain('"$GITHUB_REF_NAME" != "v${VERSION}"')`, pinning the literal
  comparison read from release.yml itself. Verified: flipping `!=` to `==` in a scratch copy of
  release.yml made this new assertion fail; reverted release.yml before committing.
- **Finding 2 (step order unverified):** the `installs with npm ci, builds, then publishes with
  provenance` test asserted presence of `npm ci`/`npm run build`/publish step but never their
  relative order or the guard's precedence. Added a new test
  `orders the publish job steps: guard, then install, then build, then publish`, mirroring
  `test/ci-workflow.test.ts:44-55`'s `indexOf` pattern with `findIndex` over the full `publish`
  job's `steps` array: asserts `guardIndex < npmCiIndex < buildIndex < publishIndex`. Verified:
  moving `npm run build` to after the publish step in a scratch copy of release.yml made this new
  assertion fail (`expected 5 to be less than 4`); reverted release.yml before committing.
- **Advisory (optional, applied):** tightened `releaseStep?.env?.['GITHUB_TOKEN']` from
  `.toBeDefined()` to `.toBe('${{ secrets.GITHUB_TOKEN }}')`, matching the file's own
  `NODE_AUTH_TOKEN` literal-value standard.

`.github/workflows/release.yml` itself is unchanged — these findings were about the tests, not the
workflow.

## Deviations from design
- None.

## Commits
- `d1e73b7` test(release): add repository.url for npm provenance (task 1/6)
- `18c4e28` feat(release): add release.yml trigger and CI gate reuse (task 2/6)
- `7bf614b` feat(release): add tag-vs-version guard step (task 3/6)
- `6ff9708` feat(release): SHA-pin checkout/setup-node and configure npm auth (task 4/6)
- `2302fae` feat(release): build and publish with npm provenance (task 5/6)
- `35969f1` feat(release): create GitHub Release and forbid gate-bypassing steps (task 6/6)
- `1f41063` test(release): pin guard operator direction and publish step order (rework #1 — tests lens)
