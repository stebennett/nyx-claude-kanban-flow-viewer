---
verdict: pass
---
# CARD-006 — Split acceptance (per-slice trace, slice mode)

Both slices traced clean: slice 1 (the shared REQ-001 guard) is a faithful additive subset that stands
alone; slice 2 (HTTP server) delivers both ACs via falsifiable tests within its own files and its guard
import resolves against slice 1 on main. Verdict: **pass** → ships 2 PRs, slice 1 first.

## [acceptance] — slice 1
### Blocking
None.
### Advisory
None.
Faithful subset: diff is 387 insertions / 0 deletions across `test/server-guard.ts` + `test/server-guard.test.ts`, matching design.md's Interfaces (`digestTree`/`assertNoRepoWrites`/`assertNoNonLoopbackNetwork`) verbatim — the same content the whole-branch panel reviewed. Stands alone: imports only `node:*` + vitest, no reference to `http-server.ts`/`index.ts`; 17 `it()` blocks match split.md's 17 self-tests and its 122/122 bootstrap; `test/**/*.ts` include + the vitest devDependency already exist on `origin/main`, so slice 1 typechecks/builds/tests with zero config changes of its own. Lead infra slice claiming no card AC — correct per split.md.

## [acceptance] — slice 2
### Blocking
None.
### Advisory
None.
Both AC-1 (200-body deep-equal vs an independent `buildSnapshot` + fixture cross-checks) and AC-2 (the live endpoint wrapped in `assertNoRepoWrites`/`assertNoNonLoopbackNetwork`) trace to falsifiable tests entirely within slice 2's own `http-server.test.ts`. The `../../test/server-guard.js` import resolves against slice 1's exports (signatures match design.md); slice 2 needs nothing beyond slice 1 + pre-existing `main` (`buildSnapshot`/`card-model.ts` from CARD-021/022, confirmed on `origin/main`) — corroborated locally (`vitest run` on the two affected test files → 23/23; typecheck/lint clean), matching split.md's cumulative 128/128. Faithful subset: `git diff --name-status` (http-server.ts, http-server.test.ts, index.ts, tsconfig.test.json) matches split.md's slice-2 path list exactly, no code added/altered by the carve.
