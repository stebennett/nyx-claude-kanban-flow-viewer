# CARD-023 — CLI `--board-dir` flag · design

## Intent
Replace the hardcoded `resolve(targetRepo, 'docs/cards')` in `src/server/index.ts` with a real
`--board-dir` flag (REQ-012): default `docs/cards`, override with a repo-relative path. In doing so,
establish `src/server/args.ts` — the pure CLI-parsing module that CARD-024 (validation), CARD-025
(`--port`) and CARD-026 (`--no-open`) each extend additively.

## Acceptance criteria
- **AC-1 (REQ-012, `docs/spec.md:99-102`):** with no `--board-dir`, the served board is `<repo>/docs/cards`.
  Observable: `parseArgs(['<repo>'])` → `{ok:true}` with `args.boardDir === 'docs/cards'`; `resolvePaths`
  → `boardDirPath === '<repo>/docs/cards'`; a `createServer` on that path answers `GET /api/board` with
  the default board's card ids and `config.wipLimit`.
- **AC-2 (REQ-012, `docs/spec.md:99-102`; REQ-010 usage form, `docs/spec.md:87-92`):**
  `--board-dir <path>` parses and the board **at that repo-relative path** is what gets served.
  Observable: against **one temp repo holding two boards**, `parseArgs(['<repo>','--board-dir','boards/alt'])`
  → `args.boardDir === 'boards/alt'`, `boardDirPath === '<repo>/boards/alt'`, and `GET /api/board` returns
  the *alt* board's cards (`['CARD-777']`, `wipLimit 7`) and **not** the default board's (`CARD-001`,
  `wipLimit 2`). The second fixture is the point: a single-board test cannot distinguish a working flag
  from a hardcoded `docs/cards`.

## In scope
- `src/server/args.ts` (new): `DEFAULT_BOARD_DIR`, `USAGE`, `EXIT_USAGE`, `CliArgs`, `ParsedArgs`,
  `ResolvedPaths`, `parseArgs(argv)`, `resolvePaths(args)`.
- `src/server/args.test.ts` (new): parse units, resolve units, one order-independence property, and the
  two-board end-to-end proof of AC-1/AC-2.
- `src/server/index.ts` (modify): wire `parseArgs`/`resolvePaths`/`USAGE`/`EXIT_USAGE`; drop the hardcoded
  board path and the inline usage string. Port stays the literal `4400` (CARD-025's).
- `test/board-fixture.ts` (new): `writeFixtureTree` / `cleanupFixtures` / `withServer`, **moved** out of
  `src/server/http-server.test.ts` (which is edited to import them). A helper exported from a `*.test.ts`
  cannot be imported without dragging that suite in, and three siblings need the same harness; this is the
  established `test/server-guard.ts` pattern (ADR-0011), not new infrastructure.
- `tsconfig.test.json` (modify): add `src/server/args.ts` to `include` (KNOWLEDGE `[CARD-019]`).

## Out of scope
- `--port` / port default 4400 / auto-increment (**CARD-025**), `--no-open` and browser launch
  (**CARD-026**), startup validation of the resolved dir (**CARD-024**). `args.ts` is *shaped* for them;
  no field, case, or `USAGE` token for them is written now.
- `--board-dir=<value>` (equals form), short flags (`-b`), `--` passthrough, `--help`/`--version`.
- Any validation that the resolved dir exists or is a board — that is REQ-014/CARD-024. `parseArgs` and
  `resolvePaths` do no I/O.
- Rejecting an absolute `--board-dir` value: `path.resolve` semantics apply (an absolute value resolves to
  itself). Documented and tested, not policed — this is a read-only local tool (REQ-001) whose operator
  names their own directories.
- A dedicated REQ-001 assertion for this card (card note; ADR-0011 sites it suite-wide — the new
  server-level tests still wrap in the shared guards).

## Dependencies & assumptions
- CARD-006 merged: `createServer(options: ServerOptions): Server` (ADR-0010) and
  `test/server-guard.ts`'s `assertNoRepoWrites` / `assertNoNonLoopbackNetwork` (ADR-0011) exist on main.
- `buildSnapshot` is total (ADR-0008); `ServerOptions.boardDir` is an **absolute** path.
- `index.ts` is coverage-excluded ([CARD-001]); `args.ts` is inside `src/server/**` and so carries the
  90% lines/functions/branches/statements target.
- Node 20+, ESM (ADR-0001). POSIX path separators in CI (ubuntu) and dev (macOS).
- `fast-check` is already a devDependency (used by `parse-card.test.ts`); no new dependency of any kind.
- No existing test pins `index.ts`'s usage text or an exact `dist/` file set (`test/packaging.test.ts`
  checks `bin`/`files`/deps/tarball-has-no-tests), so adding `args.ts` and changing the usage string
  breaks nothing.

## Approach
A single token walk over the user argv, left to right. `--board-dir` consumes the next token; a token
starting with `--` is an unknown option; the first bare token is `targetRepo`, a second is a surplus
positional. Every failure returns `{ok:false, error}` — `parseArgs` is total and never throws. Path
resolution is a *separate* pure function so the two board paths never share a name or a type: the
repo-relative flag value is `CliArgs.boardDir`, the absolute served path is `ResolvedPaths.boardDirPath`,
and `resolvePaths` is the only conversion.

**Extension shape for the chained siblings** (design note, no code now): CARD-025 adds `port: number` to
`CliArgs` with `DEFAULT_PORT` and one `case '--port'` (plus its numeric-parse error); CARD-026 adds
`open: boolean` and one `case '--no-open'` (no value token); CARD-024 adds no parsing at all — it consumes
`ResolvedPaths.boardDirPath`. Each also appends its token to `USAGE`. No signature changes, and today's
`unknown option: --port` test is the line the sibling flips.

**Alternatives considered.**
(a) *`node:util.parseArgs`* — dependency-free and handles `=`/booleans/strictness for free, but is marked
"Active development" on the Node 20 baseline (ADR-0001) and yields `ERR_PARSE_ARGS_*` messages we would
have to map to our own text anyway; the hand-rolled loop is ~40 lines and owns its error contract.
Rejected, recorded in the ADR so a later card can revisit deliberately.
(b) *commander/yargs/minimist* — rejected outright: a runtime dependency against ADR-0002/ADR-0005 for one
string flag.
(c) *Parse inside `index.ts`* — rejected: `index.ts` is the coverage-excluded I/O edge, so all four flag
cards' behaviour would ship untested.
(d) *Branded types (`type RelBoardDir = string & {__rel: true}`) for the two paths* — rejected as
disproportionate at this size; distinct field names on distinct interfaces already make a swap a type error.
(e) *Assert AC-2 at the `buildSnapshot` level instead of through the server* — rejected: "serves" is the
AC's verb, and `docs/spec.md:296-297` asks for the real server on a temp fixture board.

## Interfaces
```ts
// src/server/args.ts — pure: no fs, no process, no throw
export const DEFAULT_BOARD_DIR = 'docs/cards';
export const USAGE = 'usage: kanban-flow-viewer <path-to-repo> [--board-dir docs/cards]';
export const EXIT_USAGE = 64;                      // sysexits EX_USAGE (index.ts's exit code)

export interface CliArgs {
  targetRepo: string;   // the positional <path-to-repo>, exactly as typed
  boardDir: string;     // repo-RELATIVE; DEFAULT_BOARD_DIR when --board-dir was absent
  // CARD-025 adds `port: number`; CARD-026 adds `open: boolean` — additive, with defaults
}
export type ParsedArgs =
  | { ok: true; args: CliArgs }
  | { ok: false; error: string };

export interface ResolvedPaths {
  boardDirPath: string; // ABSOLUTE — what ServerOptions.boardDir requires
  projectName: string;  // basename of the resolved REPO root, never of the board dir
}

export function parseArgs(argv: string[]): ParsedArgs;        // argv = process.argv.slice(2)
export function resolvePaths(args: CliArgs): ResolvedPaths;   // path math only
```
Exact error strings (each asserted verbatim): `missing <path-to-repo>` · `unexpected argument: <token>` ·
`unknown option: <token>` · `--board-dir requires a value` (flag last, or next token starts with `--`) ·
`--board-dir requires a non-empty value` (value is `''`). Repeated `--board-dir` — last wins.

```ts
// test/board-fixture.ts (moved from http-server.test.ts)
export function writeFixtureTree(files: Record<string, string>, prefix?: string): string; // tmp root
export function cleanupFixtures(): void;                                                  // afterEach
export function withServer<T>(options: ServerOptions, cb: (baseUrl: string) => Promise<T> | T): Promise<T>;
```
`index.ts` exports nothing: `parseArgs(process.argv.slice(2))` → on `!ok` write `` `${error}\n${USAGE}\n` ``
to stderr and set `process.exitCode = EXIT_USAGE`; else `resolvePaths` → `createServer({boardDir:
boardDirPath, projectName}).listen(4400, '127.0.0.1', …)`.

## Data flow
`process.argv.slice(2)` → `parseArgs` (tokens → `CliArgs`, or an error string) → `resolvePaths`
(`repoRoot = resolve(targetRepo)`; `boardDirPath = resolve(repoRoot, boardDir)`;
`projectName = basename(repoRoot)`) → `createServer({boardDir: boardDirPath, projectName})` →
`GET /api/board` → `buildSnapshot` reads **that** directory. No schema, no migration, no persistence:
the only state change is which directory the existing read path points at. Both new functions are pure,
so the whole flag path is testable without fs or `process` mocking.

## Implementation task list
1. **Extract the shared server-test harness** (refactor; the 6 existing `http-server.test.ts` tests are the
   safety net). Create `test/board-fixture.ts` with `writeFixtureTree(files, prefix = 'kfv-fixture-')`,
   `cleanupFixtures()` (owns the module-level tmp-dir list) and `withServer(options, cb)` — moved verbatim
   from `src/server/http-server.test.ts` (`writeFixtureBoard` renamed, prefix parameterised). Edit
   `http-server.test.ts` to import all three and delete its local copies, keeping `afterEach(cleanupFixtures)`.
   Run `npx vitest run src/server/http-server.test.ts` → all 6 still green; `npm run lint`, `npm run typecheck`.
   Commit.
2. **`parseArgs`: positional + default board dir.** Add `src/server/args.ts` to `tsconfig.test.json`'s
   `include`. Create `src/server/args.test.ts` (failing — module absent): `'returns the positional path as
   targetRepo'` (`parseArgs(['/tmp/repo'])` → `ok`, `args.targetRepo === '/tmp/repo'`); `'defaults boardDir
   to docs/cards when --board-dir is absent'` (`args.boardDir === 'docs/cards'` **and**
   `DEFAULT_BOARD_DIR === 'docs/cards'`); `'errors when no positional is given'` (`parseArgs([])` →
   `{ok:false, error:'missing <path-to-repo>'}`). Run → red. Implement `args.ts` (constants, types,
   positional + default only). Run → green. Commit.
3. **`parseArgs`: the `--board-dir` token and its error branches.** Failing tests, each asserting the whole
   result object where useful: `'--board-dir <path> overrides the default'`
   (`['/tmp/repo','--board-dir','boards/alt']` → `{ok:true, args:{targetRepo:'/tmp/repo',
   boardDir:'boards/alt'}}`); `'accepts the flag before the positional'`
   (`['--board-dir','boards/alt','/tmp/repo']` `toEqual` the previous result); `'last --board-dir wins'`
   (`…,'--board-dir','a','--board-dir','b'` → `boardDir === 'b'`); `'errors when --board-dir has no value'`
   (`['/tmp/repo','--board-dir']` → `'--board-dir requires a value'`); `'errors when --board-dir is followed
   by another option'` (`['/tmp/repo','--board-dir','--nope']` → same message, **not** `boardDir:'--nope'`);
   `'errors on an empty --board-dir value'` (`['/tmp/repo','--board-dir','']` → `'--board-dir requires a
   non-empty value'`); `'errors on an unknown option'` (`['/tmp/repo','--port','4400']` →
   `'unknown option: --port'`, with a comment that CARD-025 flips this); `'errors on a second positional'`
   (`['/tmp/a','/tmp/b']` → `'unexpected argument: /tmp/b'`). Run → red. Implement the token loop. Green.
   Commit.
4. **Invariant property: order-independence and totality.** One `fc.assert` with `{seed: 20260721,
   numRuns: 200}` (seed convention, KNOWLEDGE `[CARD-021]`): over `repo` from
   `fc.stringMatching(/^\/tmp\/[a-z0-9_-]{1,12}$/)` and `dir` from a 1–3 segment
   `fc.stringMatching(/^[a-z0-9_-]{1,8}$/)` join — assert
   `parseArgs([repo,'--board-dir',dir])` `toEqual` `parseArgs(['--board-dir',dir,repo])` **and** that both
   equal `{ok:true, args:{targetRepo:repo, boardDir:dir}}` (the literal ground truth stops the differential
   passing vacuously when both sides degrade — KNOWLEDGE `[CARD-022]`). Second property: for
   `fc.array(fc.string(), {maxLength:6})`, `parseArgs` never throws and always returns an object with a
   boolean `ok`. Expected to pass without an implementation change; the **red evidence for this task is a
   recorded mutation run** — make the loop require the positional first (or index `argv[0]` directly) and
   paste the failing output alongside the green one. Commit.
5. **`resolvePaths`.** Failing tests: `'resolves boardDir against the repo root'`
   (`{targetRepo:'/tmp/repo', boardDir:'boards/alt'}` → `boardDirPath === '/tmp/repo/boards/alt'`, a
   hand-written literal, not a `path.resolve` call that would restate the implementation);
   `'projectName is the repo directory basename, not the board dir'` (`{targetRepo:'/tmp/my-repo',
   boardDir:'boards/alt'}` → `projectName === 'my-repo'`); `'ignores a trailing slash on targetRepo'`
   (`'/tmp/my-repo/'` → `projectName === 'my-repo'`); `'returns an absolute boardDirPath for a relative
   targetRepo'` (`{targetRepo:'.', boardDir:'docs/cards'}` → `path.isAbsolute(boardDirPath)` true and
   `boardDirPath.endsWith('/docs/cards')`); `'an absolute --board-dir value resolves to itself'`
   (`{targetRepo:'/tmp/repo', boardDir:'/elsewhere/board'}` → `boardDirPath === '/elsewhere/board'`).
   Run → red. Implement (three lines of `node:path`). Green. Commit.
6. **AC-1 + AC-2 end-to-end: the resolved dir is the board that is served.** In `args.test.ts`, build ONE
   temp repo with `writeFixtureTree({ 'docs/cards/config.md': 'wip_limit: 2', 'docs/cards/CARD-001-default/card.md':
   '<id CARD-001>', 'boards/alt/config.md': 'wip_limit: 7', 'boards/alt/CARD-777-alt/card.md': '<id CARD-777>' })`.
   Test `'serves <repo>/docs/cards when --board-dir is absent'`: `parseArgs([repo])` → `resolvePaths` →
   `withServer({boardDir: boardDirPath, projectName, now: FIXED})` → `GET /api/board` → status 200,
   `body.cards.map(c=>c.id)` `toEqual(['CARD-001'])`, `body.config.wipLimit === 2`, ids
   `not.toContain('CARD-777')`. Test `'serves the --board-dir path instead of the default'`:
   `parseArgs([repo,'--board-dir','boards/alt'])` → same pipeline → ids `toEqual(['CARD-777'])`,
   `body.config.wipLimit === 7`, ids `not.toContain('CARD-001')`, and
   `body.projectName === path.basename(repo)` (unchanged by the flag). Wrap both exercises in
   `assertNoRepoWrites(repo, …)` and `assertNoNonLoopbackNetwork(…)` (ADR-0011 — every server-level test
   adopts the guards). No production change is expected; the **red evidence is a recorded mutation run** —
   hardcode `DEFAULT_BOARD_DIR` inside `resolvePaths` and paste the second test failing with `CARD-001` /
   `wipLimit 2`. Commit.
7. **Wire `index.ts` (I/O edge, no unit test).** Replace the inline usage string and
   `resolve(targetRepo,'docs/cards')` with `parseArgs(process.argv.slice(2))` → `!ok`: stderr
   `` `${error}\n${USAGE}\n` `` + `process.exitCode = EXIT_USAGE`; `ok`: `resolvePaths` →
   `createServer({boardDir: boardDirPath, projectName}).listen(4400,'127.0.0.1', …)`. Update the header
   comment: `--board-dir` is handled here now; validation/`--port`/`--no-open` remain CARD-024/025/026.
   Verify and paste: `npm run lint`, `npm run typecheck` (`tsc -b --noEmit`, never plain `tsc --noEmit`),
   `npm run build`, `npm test` (incl. coverage thresholds and `test/packaging.test.ts`), plus a manual smoke
   — `node dist/server/index.js <fixture-repo> --board-dir boards/alt` then
   `curl -s 127.0.0.1:4400/api/board` shows `CARD-777`; `node dist/server/index.js` alone prints the usage
   and `echo $?` prints `64`. Commit.

## Test strategy
- **Gates (all must be green):** `npm run lint` (`eslint .`), `npm run typecheck` (`tsc -b --noEmit`,
  ADR-0003), `npm run build`, `npx vitest run --coverage`. `args.ts` must clear the 90%
  lines/functions/branches/statements target; `index.ts` and `test/**` stay coverage-excluded.
- **Branch coverage of `args.ts`:** default-applied (task 2) vs explicit (task 3); flag-then-positional vs
  positional-then-flag (tasks 3–4); flag-with-value vs missing value vs `--`-prefixed value vs empty value
  (task 3); unknown option; surplus positional; missing positional; repeated flag. `resolvePaths`:
  relative vs absolute `boardDir`, relative vs absolute `targetRepo`, trailing slash (task 5). Every
  enumerated outcome has its own asserted fixture — coverage % alone does not prove a branch is observed
  (KNOWLEDGE `[CARD-019]`).
- **Independently computed expectations:** every path expectation is a hand-written literal
  (`'/tmp/repo/boards/alt'`, `'my-repo'`, `'/elsewhere/board'`), never a `path.resolve`/`basename` call
  that restates the implementation. The end-to-end expectations are fixture-authored constants chosen to be
  disjoint across the two boards (`CARD-001`/`wipLimit 2` vs `CARD-777`/`wipLimit 7`), so no snapshot value
  can satisfy both.
- **Design-named contract details asserted verbatim:** the five error strings; `DEFAULT_BOARD_DIR ===
  'docs/cards'`; `EXIT_USAGE === 64`; `USAGE` contains `<path-to-repo>` and `--board-dir`;
  `boardDirPath` absolute; `projectName` from the repo root.
- **Negative and edge cases:** empty argv; `--board-dir` as the final token; `--board-dir --nope`;
  `--board-dir ''`; two positionals; an unimplemented sibling flag (`--port`); repeated `--board-dir`;
  trailing slash on the repo path; absolute `--board-dir` value.
- **Property tests (task 4):** order-independence (flag before vs after the positional yields an identical
  result) and totality (`parseArgs` never throws for arbitrary argv) — real invariants, seeded per
  `[CARD-021]`, with literal ground truth so the differential cannot pass vacuously (`[CARD-022]`).
- **Mutation → break map.** AC-1: delete the `DEFAULT_BOARD_DIR` fallback → task-2 default test and task-6
  default-serving test fail. AC-1: change `DEFAULT_BOARD_DIR` to any other string → same two fail. AC-2:
  hardcode `docs/cards` in `resolvePaths` (ignore `args.boardDir`) → task-6 alt-board test returns
  `CARD-001`/`wipLimit 2` → red (this is precisely the mutation a single-fixture test would survive).
  AC-2: drop the `case '--board-dir'` value consumption → `unknown option` errors in task 3. Swap
  `basename(repoRoot)` for `basename(boardDirPath)` → task-5 projectName test and task-6 `projectName`
  assertion fail. Accept `--nope` as a value → task-3 `--`-prefixed test fails. Drop the unknown-option
  rejection → task-3 `--port` test fails. Require the positional first → task-4 property fails. Break
  `withServer`'s cleanup → the existing `http-server.test.ts` suite (task 1) fails.
- **Determinism:** fixed `now` (`FIXED`), ephemeral `:0` ports via `withServer`, loopback only, servers
  closed in `finally`, tmp dirs removed in `afterEach(cleanupFixtures)`, pinned fast-check seed.

## Spec references
- REQ-012 — `--board-dir`, repo-relative, default `docs/cards`: `docs/spec.md:99-102`.
- REQ-010 — the `npx` usage line the `USAGE` string mirrors: `docs/spec.md:87-92`.
- REQ-001 — never writes the target repo, never calls GitHub: `docs/spec.md:13-16`.
- REQ-014 — startup validation (explicitly NOT this card; CARD-024): `docs/spec.md:109-114`.
- Testing — integration spins the real server on a temp fixture board: `docs/spec.md:296-297`.
- ADR-0010 (`createServer` factory, unlistened server) and ADR-0011 (suite-wide REQ-001 guard):
  `docs/adrs/0010-*`, `docs/adrs/0011-*`. ADR-0002/ADR-0005 (runtime deps are exactly `{gray-matter}`).
- CARD-006 `design.md` (`ServerOptions`, `withServer`/fixture harness, `index.ts` as the I/O edge) and
  CARD-018 `slice.md` (the four-way split and this card's ~130-line budget).

## Open questions
None.

## Proposed ADRs

### CLI flags parsed by a hand-rolled pure args module returning a discriminated result
**Context:** REQ-010 defines four CLI inputs (`<path-to-repo>`, `--port`, `--board-dir`, `--no-open`) and
REQ-014 adds startup validation; CARD-018's split ships them as four chained cards (CARD-023..026) that all
extend the same module. `src/server/index.ts` is the coverage-excluded I/O edge (`[CARD-001]`), so no flag
behaviour may live there. ADR-0002/ADR-0005 keep runtime dependencies at exactly `{gray-matter}`, ruling out
commander/yargs/minimist. `node:util.parseArgs` is dependency-free but is marked "Active development" on the
Node 20 baseline (ADR-0001) and emits `ERR_PARSE_ARGS_*` messages this project would then either surface to
users or have to map anyway. The parse surface must be extensible three more times without a signature
redesign or a rewrite of the siblings' tests.
**Decision:** Hand-roll the parser in a pure `src/server/args.ts` — no runtime dependency and no
`node:util.parseArgs`. It exports `DEFAULT_BOARD_DIR`, `USAGE`, `EXIT_USAGE`, and two total pure functions:
`parseArgs(argv: string[]): {ok:true; args: CliArgs} | {ok:false; error: string}` over the USER argv
(`process.argv.slice(2)`), and `resolvePaths(args: CliArgs): ResolvedPaths`. `parseArgs` never throws, never
reads fs, and never touches `process`; unknown options and surplus positionals are rejected with
project-owned messages rather than silently ignored. Path resolution is separated from token parsing, and the
repo-relative value (`CliArgs.boardDir`) and the absolute served path (`ResolvedPaths.boardDirPath`) are
distinct fields on distinct types. `index.ts` is pure wiring: parse → on `!ok` write `error` + `USAGE` to
stderr and set `process.exitCode = EXIT_USAGE` (64) → else resolve, `createServer`, `listen`.
**Consequences:** Every flag is unit-testable without spawning a process or stubbing `process.argv`, and
`index.ts` stays coverage-excluded honestly. Each sibling card is additive: CARD-025 adds `port` to `CliArgs`
with its default plus one `case '--port'`; CARD-026 adds `open: boolean` plus one `case '--no-open'`;
CARD-024 consumes `ResolvedPaths.boardDirPath` and adds no parsing at all. Error strings are ours, stable
across Node versions, and safe to assert exactly. Costs: strict rejection means an unimplemented sibling flag
errors today (`unknown option: --port`) — deliberate and test-pinned, flipped by the card that implements it;
`--board-dir=value` (equals form) is NOT accepted, only the space form the spec's usage line shows; and this
parser will never grow short flags, clustering, or `--` passthrough without a follow-up decision.
