---
id: ADR-0002
title: "Build and publish layout: two builders, one dist, no runtime dependencies"
status: Accepted
date: 2026-07-17
card: CARD-001
supersedes: []
superseded_by: ""
---

# ADR-0002: Build and publish layout: two builders, one dist, no runtime dependencies

## Context

REQ-006 splits the package into a server half and a UI half; REQ-007 requires the React SPA be
built at publish time, not at `npx` time. The two halves need incompatible TypeScript settings
(Node libs + NodeNext resolution vs DOM libs + bundler resolution + JSX), so one compiler cannot
serve both. The layout is consumed by CARD-002 (CI gates), CARD-003 (publish) and CARD-005+ (the
server that serves the bundle), so changing it later breaks three cards' contracts at once.

## Decision

`tsc -b tsconfig.server.json` emits `src/server` → `dist/server`; Vite emits `src/ui` →
`dist/ui`. `npm run build` runs UI then server. package.json declares
`bin: { "kanban-flow-viewer": "dist/server/index.js" }` and `files: ["dist"]`. The server locates
the bundle at runtime via the pure `uiDistDir(import.meta.url)` (`dist/server/../ui`), never a
hardcoded cwd-relative path. `dependencies` stays empty: React is a devDependency because Vite
bundles it into `dist/ui` at build time.

## Status

Accepted

## Consequences

Easier: `npx` does zero build work and installs zero runtime deps, so cold start is a tarball
unpack (REQ-007); each half gets the compiler settings it needs; the bundle path survives being
run from any cwd.

Harder: `dist/` is gitignored yet shipped, so the tarball contents must be verified with
`npm pack --dry-run` rather than assumed; two build steps must stay ordered in CI; the
`dist/server` ↔ `dist/ui` sibling relationship is an implicit contract between tsc's outDir,
Vite's outDir and `uiDistDir` — `test/packaging.test.ts` exists specifically to pin it.
