---
id: ADR-0003
title: "Typecheck runs `tsc -b --noEmit` across per-half projects, not `tsc --noEmit`"
status: Accepted
date: 2026-07-17
card: CARD-001
supersedes: []
superseded_by: ""
---

# ADR-0003: Typecheck runs `tsc -b --noEmit` across per-half projects, not `tsc --noEmit`

## Context

The build layout (ADR-0002) forces three TypeScript projects (server, app, node/config-files).
The idiomatic Vite arrangement is a root `tsconfig.json` that is a solution file — `files: []`
plus `references` — with the real settings in `tsconfig.{server,app,node}.json`. CARD-001's
acceptance criterion names the gate as `tsc --noEmit`, but under this layout that command
resolves the root config, finds zero input files, and exits zero having checked nothing: a gate
that passes on a codebase full of type errors. CARD-002 wires this exact script into CI, so a
false green here silently disables REQ-036's type gate for the life of the project.

The mechanism was verified independently at the design check: TypeScript suppresses TS18003
("No inputs were found in config file") when the config declares `files` and/or `references`
(the guard is `canJsonReportNoInputFiles = !hasProperty(raw, "files") && !hasProperty(raw,
"references")`), and non-build `tsc -p` does not traverse `references`. This is why the stock
Vite template pairs a solution root with `tsc -b`.

## Decision

`npm run typecheck` runs `tsc -b --noEmit` (TypeScript >= 5.6, pinned), which walks the root
config's project references and checks all three projects. Plain `tsc --noEmit` is never used as
a gate. The gate's honesty is proven, not assumed: implementation injects a type error into
`src/server/paths.ts`, `src/ui/App.tsx` and `vite.config.ts` in turn and records that each turns
the gate red. If the pinned TypeScript rejects `-b --noEmit`, the recorded fallback is three
explicit `tsc -p <config> --noEmit` runs chained with `&&` — same contract, same mutation
evidence.

## Status

Accepted

## Consequences

Easier: one command checks every project including config files; editors get correct per-file
settings from the solution layout; adding a fourth project (e.g. a jsdom test project when
component tests land) means one more reference, not a new script.

Harder: the leaf configs must be `composite: true`, which pulls in `.tsbuildinfo` files (already
gitignored) and incremental-build staleness as a possible confusion source; `tsc --noEmit`
remains available at the terminal as a footgun that looks like it works, mitigated only by the
KNOWLEDGE entry; this deviates from the literal wording of CARD-001's AC-2, which the sharpened
criterion restates as an observable.

**Recommended follow-up (design check advisory 2):** `docs/spec.md` REQ-036 still names
`tsc --noEmit` as the CI gate. CARD-002 designs CI from REQ-036, so the spec text should be
amended via `/requirement` to stop contradicting the gate this ADR establishes.
