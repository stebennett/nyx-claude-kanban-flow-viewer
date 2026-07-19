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
- Added `test/release-workflow.test.ts` (12 tests, js-yaml + JSON contract test mirroring
  `test/ci-workflow.test.ts`/`test/packaging.test.ts`): asserts every AC plus the two false-green
  guards from KNOWLEDGE [CARD-002] (SHA-pin shape on every non-local `uses:`; no
  `continue-on-error: true` or skipping `if:` on any gate/publish step).

## Deviations from design
- None. `release.yml` matches the design's `## Interfaces` block verbatim (including the
  resolved SHA pins the design flagged as implementer's responsibility to resolve).

## Commits
- `d1e73b7` test(release): add repository.url for npm provenance (task 1/6)
- `18c4e28` feat(release): add release.yml trigger and CI gate reuse (task 2/6)
- `7bf614b` feat(release): add tag-vs-version guard step (task 3/6)
- `6ff9708` feat(release): SHA-pin checkout/setup-node and configure npm auth (task 4/6)
- `2302fae` feat(release): build and publish with npm provenance (task 5/6)
- `35969f1` feat(release): create GitHub Release and forbid gate-bypassing steps (task 6/6)
