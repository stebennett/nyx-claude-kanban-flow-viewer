---
id: ADR-0004
title: "CI gates run as a single reusable workflow, with no build-state caching"
status: Accepted
date: 2026-07-18
card: CARD-002
supersedes: []
superseded_by: ""
---

# ADR-0004: CI gates run as a single reusable workflow, with no build-state caching

## Context

REQ-036 needs lint/typecheck/test/build on every PR; REQ-037 (CARD-003) requires the *same*
gates before an irreversible npm publish. If the two gate lists live in two files they drift,
and REQ-037's "same gates" becomes silently false with no card's criteria failing. Separately,
CARD-001 established (ADR-0003 + a KNOWLEDGE gotcha) that `tsc -b` trusts a stale `*.tsbuildinfo`
and no-ops to a false green, so any CI cache of build state without also caching `dist/` turns the
build gate green while building nothing. Both are cross-cutting and expensive to reverse once
CARD-003 stands on the boundary.

## Decision

One workflow `.github/workflows/ci.yml` with `on: [pull_request(branches: [main]), workflow_call]`
and one `gates` job: `actions/checkout@v4` → `actions/setup-node@v4` (node 20, `cache: npm`) →
`npm ci` → `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`, as sequential named
steps. `permissions: contents: read`. CARD-003 reuses the gates via
`uses: ./.github/workflows/ci.yml` (no inputs, no secrets). CI caches **only** the `~/.npm` download
cache (setup-node); it adds **no** `actions/cache` for `dist/` or `*.tsbuildinfo` — no build state is
cached at all. Node is a single version 20 (the `engines` floor), not a matrix.

## Status

Accepted

## Consequences

Easier: one authoritative gate definition that PR CI and the release both consume, so they cannot
drift; the stale-tsbuildinfo false green is structurally impossible in CI; least-privilege
permissions.

Harder: a single job short-circuits later gates when an early gate fails, so each gate's independent
red is proven by gate-isolated seeds, not one run; CARD-003 inherits the `workflow_call` signature
(adding a matrix or splitting jobs later is a breaking change to that contract); no node_modules
cache warmth (acceptable — `npm ci` from a warm `~/.npm` is fast).
