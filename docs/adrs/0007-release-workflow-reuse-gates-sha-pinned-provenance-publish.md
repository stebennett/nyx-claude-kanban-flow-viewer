---
id: ADR-0007
title: "Release on a vX.Y.Z tag: reuse CI gates, SHA-pinned actions, provenance publish"
status: Accepted
date: 2026-07-18
card: CARD-003
supersedes: []
superseded_by: ""
---

# ADR-0007: Release on a vX.Y.Z tag: reuse CI gates, SHA-pinned actions, provenance publish

## Context

REQ-037 makes a `vX.Y.Z` tag push the sole release trigger; an npm publish is permanent (npm forbids
republishing a version), and the publish job carries `NPM_TOKEN` + an OIDC `id-token`, making it the
repo's only secret-bearing, supply-chain-exposed workflow. It consumes CARD-002's gate contract
(`.github/workflows/ci.yml`) and CARD-001's build/publish layout (ADR-0002), so the trigger/auth/pinning
model is expensive to reverse and cross-cutting.

## Decision

`.github/workflows/release.yml` triggers only on `push: tags: ['v[0-9]+.[0-9]+.[0-9]+']`. A `gates`
job reuses the CI gates verbatim via `uses: ./.github/workflows/ci.yml` (workflow_call); a `publish`
job runs `needs: gates` (so any gate failure skips publish). `publish` verifies
`github.ref_name == v<package.json version>` as its first step (fail → `exit 1`, nothing published),
SHA-pins every third-party action to a full 40-hex commit SHA (with a trailing `# vX.Y.Z` comment) —
never a `@vN` moving tag — authenticates via `actions/setup-node` `registry-url` +
`NODE_AUTH_TOKEN=secrets.NPM_TOKEN`, runs `npm ci` → `npm run build` → `npm publish --provenance
--access public`, and creates a GitHub Release with `gh release create --generate-notes`. Permissions
are least-privilege: top-level `contents: read`; the `publish` job adds `contents: write` (the Release)
+ `id-token: write` (provenance OIDC). `package.json` gains a `repository.url` field (a hard npm
provenance prerequisite), pointing at the git remote `stebennett/nyx-claude-flow-viewer`.

## Status

Accepted

## Consequences

Easier: cutting a release is one `git tag vX.Y.Z && git push --tags`; the gates can never drift from PR
CI (single-sourced workflow); provenance gives consumers a verifiable supply-chain attestation; a
compromised action tag cannot reach the `NPM_TOKEN` (SHA pins). Harder: the version must be bumped in
`package.json` before tagging (the guard rejects a stale/un-bumped version); SHA pins need periodic
manual bumps (resolve with `gh api /repos/<owner>/<action>/git/ref/tags/<tag> --jq .object.sha`); the
`NPM_TOKEN` secret and the App's `Workflows: write` permission are manual, out-of-band prerequisites no
card can create. The read-only PR-gate workflow (`ci.yml`) may keep `@v4` moving tags — the SHA-pin
requirement is scoped to the secret-bearing publish job.
