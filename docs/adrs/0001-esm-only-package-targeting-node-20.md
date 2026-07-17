---
id: ADR-0001
title: ESM-only package targeting Node 20+
status: Accepted
date: 2026-07-17
card: CARD-001
supersedes: []
superseded_by: ""
---

# ADR-0001: ESM-only package targeting Node 20+

## Context

The package is a hybrid Node CLI + React SPA launched via `npx`. Vite, Vitest and ESLint 9's
flat config are all ESM-native; the server half must interoperate with them. CJS/ESM is a
whole-tree decision that every later card (CARD-004+ parser, server, UI) inherits, and
reversing it after ~30 source files exist means rewriting every import and re-testing the bin
resolution.

## Decision

Ship `"type": "module"` with `engines.node >= 20`. The server compiles to ESM
(`module: NodeNext`); relative imports in `src/server` carry explicit `.js` extensions. No dual
CJS/ESM build, no `exports` map back-compat shim. Module-relative paths use `import.meta.url` +
`fileURLToPath`, never `__dirname`.

## Status

Accepted

## Consequences

Easier: one module system across server, UI, configs and tests; `eslint.config.js` and
`vite.config.ts` need no interop shim; `import.meta.url` gives the bin a reliable self-locating
path for the UI bundle.

Harder: consumers on Node < 20 are unsupported (acceptable — the viewer is a local dev tool, not
a library); any CJS-only dependency a later card wants must be interop-checked; the
`.js`-extension-on-TS-imports rule is a recurring papercut that ESLint must enforce.
