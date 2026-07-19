# CARD-003 — Deliver

## PR
https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/39 (implementation, unsplit)

## What shipped
PR #39 (18 commits) implements the release workflow:
- `.github/workflows/release.yml`: two jobs (`gates` reusing ci.yml via `workflow_call`; `publish`,
  `needs: gates`) with SHA-pinned actions, a vX.Y.Z-only trigger, a tag-vs-version guard, provenance
  publish, and a GitHub Release; least-privilege permissions.
- `package.json`: added `repository.url` (provenance prerequisite).
- `test/release-workflow.test.ts`: 13 contract tests.

## Delivery
Rebased task/003-release-on-version-tag cleanly onto origin/main (no conflicts). All gates green post-
rebase: lint, typecheck, 67 tests (incl. 13 release-workflow contract tests), build; rollup lockfile
matrix intact (25 entries). Branch pushed; PR #39 opened against main.

## Post-merge
On merge, CARD-003 is complete. The release workflow goes live: pushing a `vX.Y.Z` tag runs the CI
gates and, on success, publishes to npm with provenance and creates a GitHub Release. Manual
prerequisite: an `NPM_TOKEN` repo secret must be configured before the first real release.
