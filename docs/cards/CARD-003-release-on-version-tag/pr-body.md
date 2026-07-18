## CARD-003 — design: Publish npm package and GitHub Release on a vX.Y.Z tag   [task · infra]

### Why
Make `npx kanban-flow-viewer` reachable by end users and turn cutting a version into a single tag push.
Pushing a `vX.Y.Z` tag runs a release workflow that reuses CARD-002's CI gates, then — only if the tag
matches `package.json`'s version — builds, publishes to npm with provenance, and creates a GitHub
Release. An npm publish is permanent, so the version/tag guard and the gate wall are load-bearing.

### Design summary
- One new workflow `.github/workflows/release.yml`: triggers on `push` tags matching
  `v[0-9]+.[0-9]+.[0-9]+` (only `vX.Y.Z`, not `v1`/`v1.2`/`-rc1`); a `gates` job **reuses CARD-002's
  gates verbatim** via `uses: ./.github/workflows/ci.yml`; a `publish` job runs `needs: gates`.
- `publish` verifies `github.ref_name == v<package.json version>` (fail → nothing published),
  `npm ci` → `npm run build` → `npm publish --provenance --access public`, then
  `gh release create --generate-notes`.
- **Supply-chain hardening:** every third-party action in the secret-bearing publish job is **SHA-pinned**
  to a 40-hex commit (not `@v4`); least-privilege permissions (top-level `contents: read`; publish
  `contents: write` + `id-token: write`); auth via `NODE_AUTH_TOKEN`=`secrets.NPM_TOKEN`.
- `package.json` gains `repository.url` (a hard npm-provenance prerequisite).
- **Tests** are a js-yaml contract test (`test/release-workflow.test.ts`) over `release.yml` + `package.json`
  — the CARD-002 `ci-workflow.test.ts` pattern — asserting trigger shape, gate reuse/order, SHA-pinning,
  permissions, version guard, provenance publish, Release creation, and no `continue-on-error`/skipping-`if`.

### Acceptance criteria (sharpened)
- A `vX.Y.Z` tag push runs the workflow; other tag shapes do not (REQ-037).
- A tag ≠ `v<package.json version>` fails the workflow and publishes nothing (REQ-037).
- On match, the package builds and `npm publish --provenance` runs (REQ-037, REQ-007).
- A GitHub Release is created for the tag with generated notes (REQ-037).
- lint→typecheck→build→test run (via `uses: ./.github/workflows/ci.yml`) before publish; any gate
  failure publishes nothing (REQ-037).

### ADRs in this PR
- ADR-0007 — Release on a vX.Y.Z tag: reuse CI gates, SHA-pinned actions, provenance publish.

### Open questions / decisions deferred
- **Out-of-band prerequisites (not this card's code, flagged as assumptions):** the `NPM_TOKEN` repo
  secret must be configured, and the nyxhub-bot App needs `Workflows: write` to accept the
  `.github/workflows/release.yml` push (the credential-helper issue that blocked CARD-002 is now fixed).
  The maintainer bumps `package.json` `version` before tagging (the guard rejects a stale version).

Full design: `docs/cards/CARD-003-release-on-version-tag/design.md` (in this diff). Merging this PR
approves the design and unblocks implementation — the implementation branch is cut from main after this
merges, and the code arrives as a second PR.

🤖 Design delivered via /kanban
