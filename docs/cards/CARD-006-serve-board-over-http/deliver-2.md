# Deliver — CARD-006 slice 2 of 2

**This is the final slice (2 of 2) of CARD-006 — Serve the parsed board over HTTP.**

## PR

Slice 2 PR: https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/59

**Sibling slice:**
- Slice 1 (the shared server-guard): PR #58 — already merged to `main`

## What shipped

Cut from the `main` that already carries slice 1, so the slice-2 tests resolve their
`test/server-guard.ts` import against merged code. Four paths, matching `split.md`'s
slice-2 assignment exactly:

- `src/server/http-server.ts` — added
- `src/server/http-server.test.ts` — added
- `src/server/index.ts` — modified
- `tsconfig.test.json` — modified

Two commits on the slice branch:
1. `feat(card): CARD-006 slice 2/2 — HTTP server + CLI wiring` — the `createServer()`
   factory, the `GET /api/board` endpoint, and the CLI entry point
2. `docs(card): CARD-006 slice 2/2 PR body`

## Gates

All green before the PR opened: `npm run lint`, `npm run typecheck`, `npm run build`,
`npm test` → **128/128 across 9 test files** (including the 6 `http-server.test.ts`
tests). The cumulative branch state equals the full original change set.

## Post-merge

Once this PR merges, Reconcile runs the completeness backstop against the original
branch (`feature/006-serve-board-over-http`); on an empty result CARD-006 reaches
`done` and the original branch is torn down locally and on `origin`. Both acceptance
criteria are proven by this slice:

- `npx kanban-flow-viewer <path-to-repo>` starts a server on port 4400 and
  `GET /api/board` returns the parsed snapshot
- The viewer makes no writes to the target repo and no network calls to GitHub (both
  assertions come from slice 1's server-guard)
