---
id: ADR-0009
title: "Publish via npm Trusted Publishers (OIDC) instead of an NPM_TOKEN secret"
status: Accepted
date: 2026-07-20
card: CARD-003
supersedes: [ADR-0007]
superseded_by: ""
---

# ADR-0009: Publish via npm Trusted Publishers (OIDC) instead of an NPM_TOKEN secret

## Context

ADR-0007 established the `vX.Y.Z`-tag release workflow and authenticated the npm publish with a
long-lived `NPM_TOKEN` secret (`NODE_AUTH_TOKEN=${{ secrets.NPM_TOKEN }}`). npm now offers **Trusted
Publishers** (https://docs.npmjs.com/trusted-publishers): the registry is configured to trust a specific
GitHub Actions workflow, and the workflow authenticates per-publish via an OIDC `id-token` — no shared
secret. The driver asked (PR #39 review) to adopt it. This reverses only the *auth mechanism* of
ADR-0007; every other decision it made (tag trigger, gate reuse, version guard, SHA-pinned actions,
provenance, least-privilege permissions, `repository.url`) still holds, so this ADR restates them and
supersedes ADR-0007 in full rather than leaving a split record.

## Decision

`.github/workflows/release.yml` triggers only on `push: tags: ['v[0-9]+.[0-9]+.[0-9]+']`. A `gates`
job reuses CI verbatim via `uses: ./.github/workflows/ci.yml` (workflow_call); a `publish` job runs
`needs: gates` (any gate failure skips publish). `publish` verifies `github.ref_name == v<package.json
version>` as its first step (fail → `exit 1`, nothing published), SHA-pins every third-party action to a
full 40-hex commit SHA (trailing `# vX.Y.Z` comment), sets up Node 20 with `registry-url:
https://registry.npmjs.org`, runs `npm ci` → `npm run build`, then **`npm install -g npm@latest`** (Node
20 bundles npm 10.x; Trusted-Publishers OIDC requires npm ≥ 11.5.1), then `npm publish --provenance
--access public`, and creates a GitHub Release with `gh release create --generate-notes`. **No
`NODE_AUTH_TOKEN` and no `NPM_TOKEN` secret** — authentication is the OIDC `id-token` alone. Permissions
stay least-privilege: top-level `contents: read`; `publish` adds `contents: write` (the Release) +
`id-token: write` (now load-bearing — it is the publish credential, not just for provenance).
`package.json` keeps its `repository.url` (an npm provenance prerequisite).

## Status

Accepted

## Consequences

Easier: no long-lived publish secret exists to leak, rotate, or scope — the credential is a short-lived
per-run OIDC token bound to this repo+workflow, the current supply-chain best practice; provenance is
produced automatically under trusted publishing (the `--provenance` flag is kept for explicitness).
Harder: a **one-time manual prerequisite** on npmjs.com — configure a Trusted Publisher on the package
pointing at this repo and the `release.yml` workflow — must exist before the first tag, and it is
out-of-band (no card can create it, same class of manual step the old `NPM_TOKEN` secret was); the
workflow now depends on npm ≥ 11.5.1, pulled in per-run via `npm install -g npm@latest` (a global CLI
upgrade, distinct from dependency install — `npm ci` still installs deps). All other ADR-0007
consequences (version must be bumped before tagging; SHA pins need periodic manual bumps; gates
single-sourced) carry forward unchanged.
