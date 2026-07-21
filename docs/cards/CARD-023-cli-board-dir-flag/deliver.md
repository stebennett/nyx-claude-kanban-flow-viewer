# CARD-023 — deliver (implementation PR)

## PR
https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/65 — `CARD-023 — CLI --board-dir flag`

- Base `main` ← head `feature/023-cli-board-dir-flag` · author `app/nyxhub-bot`
- Design PR #61 (ADR-0012) merged first; this is the implementation half.
- 837 insertions / 114 deletions total, of which **463 added / 55 deleted** are code
  (`docs/cards/**` excluded per `size_exclude`) — against `size_limit` 500.

## Rebase — a no-op, and why that matters
`git rebase origin/main` was a genuine no-op: merge-base already equalled `origin/main`'s tip
(`c3b71e4`). The two sibling PRs that merged since this branch was cut — #62 (CARD-008) and #63
(CARD-027) — were **design PRs, docs-only**. Neither has touched `src/server/http-server.ts` or
`http-server.test.ts` on `main` yet.

**So the anticipated ADR-0013/ADR-0014 reconciliation has not happened — it has only been deferred.**
The real collision arrives when the *implementation* PRs meet:

| card | what it does to the shared files |
|---|---|
| CARD-023 (this PR, #65) | **moves** `writeFixtureBoard`/`withServer` out of `http-server.test.ts` into `test/board-fixture.ts`, renaming the former to `writeFixtureTree` |
| CARD-027 (in review) | adds `openSse`, two module-level sweep arrays and `closeAllConnections()` **inside** `http-server.test.ts`'s copy of `withServer`, plus the `/api/events` branch in `http-server.ts` |
| CARD-008 (implementing) | adds a **required** `repoRoot` to `ServerOptions` and hoists the per-route `try/catch` into one handler-wide catch |

Whichever of CARD-023 / CARD-027 merges second will conflict on `http-server.test.ts`, and the
resolution is **not** mechanical: CARD-027's `closeAllConnections()` fix must end up in the *shared*
`test/board-fixture.ts` `withServer`, not in a private copy, or every server-level suite that imports
the shared helper keeps the hanging version. Recorded in KNOWLEDGE `[CARD-023]`/`[CARD-027]` and in
both cards' `implement.md`.

## Gates (post-rebase, all green)
```
npm run lint      → ESLint: No issues found
npm run typecheck → tsc -b --noEmit, exit 0
npm run build     → vite build + tsc -b tsconfig.server.json --force, clean
npm test          → 10 files, 151/151 passed (2.65s)
```

## Diff scope
`src/server/args.ts` (new, 108) · `src/server/args.test.ts` (new, 285) ·
`test/board-fixture.ts` (new, 52) · `src/server/index.ts` (wiring only) ·
`src/server/http-server.test.ts` (imports the shared harness) · `tsconfig.test.json` (+1)
— plus the card's `implement.md` / `test.md` / `review.md` / `pr-body.md`. Nothing unexpected.

No CHANGELOG exists in this repo yet (pre-1.0, no release convention established).

## Post-merge
Single-slice card, not split — this is its only implementation PR. On merge the card goes `done`.
