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
- Added `package.json` `repository.url` — a hard `npm publish --provenance` prerequisite.
- Added `test/release-workflow.test.ts` (14 tests, js-yaml + JSON contract test mirroring
  `test/ci-workflow.test.ts`/`test/packaging.test.ts`): asserts every AC plus the false-green
  guards from KNOWLEDGE [CARD-002] (SHA-pin shape; no `continue-on-error`/skipping `if:`).

## Rework (review #1 — tests lens)
Addressed both tests-lens blocking findings:
- **Guard operator direction unpinned:** added `expect(guardStep?.run).toContain('"$GITHUB_REF_NAME" != "v${VERSION}"')`, pinning the literal comparison (an inverted `==` now fails the test). Mutation-verified.
- **Step order unverified:** added `orders the publish job steps: guard, then install, then build, then publish` using `findIndex` (`guardIndex < npmCiIndex < buildIndex < publishIndex`). Mutation-verified.
- **Advisory applied:** tightened `GITHUB_TOKEN` env to `.toBe('${{ secrets.GITHUB_TOKEN }}')`.

## Rework (review #2 — tests lens re-run)
Addressed the one blocking finding from the tests-lens re-run:
- **Release-targets-tag unasserted:** `creates a GitHub Release with generated notes` asserted a
  release step with `gh release create` + `--generate-notes` + a token env, but never that the
  release targets the pushed tag (AC-4). Verified by mutation: a hardcoded wrong tag
  (`gh release create "v0.0.0-wrong" …`) passed all tests. Added an assertion that the release
  step's `run` references `$GITHUB_REF_NAME`. Verified the hardcoded-tag mutation now fails; reverted
  release.yml (no diff — it was already correct).

`.github/workflows/release.yml` remains unchanged across both reworks — every finding was a
test-strength gap, not a workflow defect.

## Deviations from design
- None.

## Commits
- `d1e73b7` … `35969f1` (original 6 TDD commits)
- `1f41063` test(release): pin guard operator direction and publish step order (rework #1 — tests lens)
- `8f0aab6` test(release): assert the Release step targets the pushed tag (rework #2 — tests lens re-run)
