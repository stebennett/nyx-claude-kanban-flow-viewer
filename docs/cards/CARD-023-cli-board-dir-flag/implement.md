# CARD-023 — implement

## What changed
- **`src/server/args.ts` (new, 108 lines).** The pure CLI-parsing module of ADR-0012:
  `DEFAULT_BOARD_DIR`, `USAGE`, `EXIT_USAGE`, `CliArgs`/`ParsedArgs`/`ResolvedPaths`,
  `parseArgs(argv)` and `resolvePaths(args)`. No fs, no `process`, no throw.
  `parseArgs` is one left-to-right walk over token **values**; `--board-dir` consumes the
  next token (last wins), any other `--`-prefixed token is an unknown option, the first
  bare token is `targetRepo`, a second is a surplus positional. Five project-owned error
  strings. `resolvePaths` is the **only** conversion from the repo-relative
  `CliArgs.boardDir` to the absolute `ResolvedPaths.boardDirPath`; `projectName` is the
  basename of the resolved **repo root**, never of the board dir.
- **`src/server/args.test.ts` (new, 285 lines).** 23 tests: 3 constants, 3 positional +
  default, 3 `--board-dir` acceptance, 5 error branches, 2 seeded properties, 5
  `resolvePaths` units (all expectations hand-written literals), 2 two-board end-to-end.
- **`test/board-fixture.ts` (new, 52 lines).** `writeFixtureTree` / `cleanupFixtures` /
  `withServer`, moved verbatim out of `http-server.test.ts` (`writeFixtureBoard` renamed,
  prefix parameterised). `http-server.test.ts` imports all three; its 6 tests are the
  refactor's safety net and were green before and after.
- **`src/server/index.ts`.** Pure wiring: `parseArgs(process.argv.slice(2))` → on `!ok`
  stderr `` `${error}\n${USAGE}\n` `` + `process.exitCode = EXIT_USAGE` → else
  `resolvePaths` → `createServer({boardDir: boardDirPath, projectName}).listen(4400,
  '127.0.0.1', …)`. The hardcoded `resolve(targetRepo,'docs/cards')` and inline usage
  string are gone; the port stays the literal 4400 (CARD-025's).
- **`tsconfig.test.json`.** `src/server/args.ts` added to `include` (TS6307, [CARD-019]).

## Design-check advisories folded in
1. **Branch-coverage trap** — the walk iterates values and carries the pending flag in a
   local; no `argv[i]`/`?? ''` anywhere. `args.ts` reports **100% branches**.
2. **Fixture `config.md` delimiters** — both fixtures use `'---\nwip_limit: N\n---\n'`, so
   the 2-vs-7 discriminator really discriminates (verified: the mutation run reads
   `wipLimit` from the fixture, not `DEFAULT_WIP_LIMIT`).
3. **Task 6 reverts its mutation** — reverted and re-run green before committing;
   `git diff --stat src/server/args.ts` was empty after each revert.
4. **Size** — 463 added lines, under `size_limit` 500; task 4's property pair was kept
   because the cap was not breached (see below).
5–7. Recorded, no action needed at implement (ADR text was corrected by the orchestrator;
   the M2 `--port` interval is deliberate and pinned by `errors on an unknown option`).

## Deviations from design
- **Property arbitrary tightened.** The design's segment arbitrary
  `fc.stringMatching(/^[a-z0-9_-]{1,8}$/)` can generate `--`, which `parseArgs` correctly
  reads as an option, not a value — the property would fail on a *correct* implementation.
  Changed to `/^[a-z0-9][a-z0-9_-]{0,7}$/` (segment starts alphanumeric). This is
  KNOWLEDGE [CARD-022]: generate inputs the code under test accepts. The invariant, the
  seed (`{seed: 20260721, numRuns: 200}`) and the literal ground truth are unchanged.
- **Constants tests sited in task 2.** The design's test strategy names `EXIT_USAGE === 64`
  and `USAGE` containing `<path-to-repo>`/`--board-dir` but assigns them no task; they ride
  task 2, which is where the constants land.
- **Nothing else.** No `ServerOptions` field added, `handleRequest` untouched (CARD-008 /
  CARD-027 own those); `index.ts`'s `createServer` call is still two-field.

## Gate evidence
```
$ npm run lint          → eslint .            (no output, exit 0)
$ npm run typecheck     → tsc -b --noEmit     (no output, exit 0)
$ npm run build         → vite build ✓ built in 452ms; tsc -b tsconfig.server.json --force
$ npm test              → Test Files 10 passed (10) | Tests 151 passed (151)
$ npx vitest run --coverage
  All files          |     100 |     98.3 |     100 |     100 |
   args.ts           |     100 |      100 |     100 |     100 |
```
**Recorded mutations** (both reverted; `git diff --stat src/server/args.ts` empty after):
- task 4 — require the positional before `--board-dir` → `2 failed | 14 passed`,
  `Counterexample: ["/tmp/-","a"]`.
- task 6 — hardcode `DEFAULT_BOARD_DIR` inside `resolvePaths` → `3 failed | 20 passed`,
  alt-board test: `expected [ 'CARD-001' ] to deeply equal [ 'CARD-777' ]`.

**Manual smoke** (`node dist/server/index.js`, two-board fixture repo, coverage-excluded
`index.ts`'s only evidence):
```
$ node dist/server/index.js $SMOKE --board-dir boards/alt ; curl -s 127.0.0.1:4400/api/board
kanban-flow-viewer serving smoke-repo at http://localhost:4400
{"…","config":{"wipLimit":7},"cards":[{"id":"CARD-777",…}],…}
$ node dist/server/index.js $SMOKE ; curl -s 127.0.0.1:4400/api/board
{"…","config":{"wipLimit":2},"cards":[{"id":"CARD-001",…}],…}
$ node dist/server/index.js            → missing <path-to-repo> / usage: … ; exit=64
$ node dist/server/index.js $SMOKE --port 4400 → unknown option: --port / usage: … ; exit=64
```

## Size
`git diff --numstat origin/main`, excluding `package-lock.json` and `docs/cards/**`:
**463 added / 55 deleted**. Per-file added: `args.test.ts` 285, `args.ts` 108,
`board-fixture.ts` 52, `index.ts` 12, `http-server.test.ts` 5, `tsconfig.test.json` 1.
463 < `size_limit` 500 (the added-column measure DLV-SIZE used on CARD-019/CARD-021).
45 of the 55 deletions are the verbatim harness move out of `http-server.test.ts`.
vs the design's ~410 projection: +13%; vs `estimated_lines: 130`: 3.6x, the known and
accepted delta recorded on the card. Task 4's ~42-line property pair — the pre-authorised
cut — was **not** taken: the cap was not breached, and both properties are load-bearing
(the order-independence one is what the task-4 mutation reddened).

## Cross-card note for whoever merges second
`withServer` now lives in the shared `test/board-fixture.ts`, not in `http-server.test.ts`.
KNOWLEDGE [CARD-027]'s fix — `server.closeAllConnections()` before awaiting `close()`, or
`close()` hangs forever on an in-flight SSE stream — **must land in this shared helper**, not
in a private copy, because every server-level suite now shares it. CARD-027 is implementing
against a base where the helper is still private; that edit will need re-siting on merge.

## Commits
- `c932b0b` refactor(test): extract the server-test harness to test/board-fixture.ts
- `4601d12` feat(server): add args.ts with the positional and the default board dir
- `df365de` feat(server): parse the --board-dir token and its error branches
- `bbfd0d8` test(server): property-test parseArgs order-independence and totality
- `0e4afa2` feat(server): add resolvePaths, the sole relative-to-absolute board conversion
- `ea4de39` test(server): prove end to end that the resolved dir is the board served
- `10e4929` feat(server): wire --board-dir through the CLI entry point
