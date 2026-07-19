## CARD-003 — Publish npm package and GitHub Release on a vX.Y.Z tag   [task · infra]

### Why
Make `npx kanban-flow-viewer` reachable by end users and turn cutting a version into a single tag push.
Pushing a `vX.Y.Z` tag runs a release workflow that reuses CARD-002's CI gates, then — only if the tag
matches `package.json`'s version — builds, publishes to npm with provenance, and creates a GitHub
Release. An npm publish is permanent, so the version/tag guard and the gate wall are load-bearing.

### What changed
- Added `.github/workflows/release.yml`: two jobs — `gates` reuses `./.github/workflows/ci.yml` via
  `workflow_call` (so "the same gates as CI" is a structural guarantee, not a copy that can drift);
  `publish` (`needs: gates`) triggers only on `push` tags matching `v[0-9]+.[0-9]+.[0-9]+`.
- `publish` job: SHA-pinned `actions/checkout@…v4.2.2` and `actions/setup-node@…v4.1.0`; a version-guard
  first step that `exit 1`s if `github.ref_name != v<package.json version>`; `npm ci` → `npm run build`
  → `npm publish --provenance --access public`; `gh release create "$GITHUB_REF_NAME" --generate-notes`.
  Least-privilege permissions (top-level `contents: read`; publish `contents: write` + `id-token: write`).
- Added `package.json` `repository.url` (a hard `npm publish --provenance` prerequisite).
- Added `test/release-workflow.test.ts` (13 js-yaml/JSON contract tests) asserting every AC plus the
  false-green guards (SHA-pin shape; no `continue-on-error`/skipping `if:` on gate/publish steps).

**Manual prerequisite (no card can create it):** an `NPM_TOKEN` repo secret. The workflow already
declares `id-token: write` (provenance) and `contents: write` (Release).

### Acceptance criteria
- [x] Pushing a `vX.Y.Z` tag triggers the release workflow; other tag shapes do not (REQ-037)
- [x] A tag not matching package.json's version fails the workflow and publishes nothing (REQ-037)
- [x] On match, the package builds and publishes to npm with provenance (REQ-037, REQ-007)
- [x] A GitHub Release is created for the tag with generated notes (REQ-037)
- [x] The release workflow runs lint, typecheck, test and build before the publish step; any gate
      failing fails the workflow and publishes nothing (REQ-037)

### Testing
`npm test` 67/67 (13 release-workflow contract tests); 100% core-logic coverage; lint, typecheck
(`tsc -b --noEmit`), and build all green; rollup lockfile matrix intact (25 entries). Assertions pin
literal design values (trigger glob, guard comparison direction, step order, tag-target on the Release),
each mutation-verified — not read back from the workflow under test.

### Review
Full 8-lens panel: **pass**. 7 lenses clean on the first pass (advisories only). The **tests** lens ran
two rework rounds — round 1 caught an unpinned guard operator direction and unverified publish step
order; round 2 caught the Release step not being asserted to target the pushed tag — all three
mutation-verified fixed on the round-3 re-run. ADR-0007 (release model) governs this card.

### Knowledge
KNOWLEDGE [CARD-003]: SHA-pin resolution procedure; provenance `repository.url` prerequisite; the
`GITHUB_REF_NAME` default-var redundancy; the release-vs-publish ordering recovery note; workflow
step-order tested via `findIndex` chains.

🤖 Card delivered via /kanban
