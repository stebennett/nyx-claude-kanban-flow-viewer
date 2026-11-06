---
id: ADR-0012
title: "CLI flags parsed by a hand-rolled pure args module returning a discriminated result"
status: Accepted
date: 2026-07-21
card: CARD-023
supersedes: []
superseded_by: ""
---

# ADR-0012: CLI flags parsed by a hand-rolled pure args module returning a discriminated result

## Context

REQ-010 defines four CLI inputs (`<path-to-repo>`, `--port`, `--board-dir`, `--no-open`) and REQ-014
adds startup validation; CARD-018's split ships them as four chained cards (CARD-023..026) that all
extend the same module. `src/server/index.ts` is the coverage-excluded I/O edge (`[CARD-001]`), so no
flag behaviour may live there. ADR-0002/ADR-0005 keep runtime dependencies at exactly `{gray-matter}`,
ruling out commander/yargs/minimist.

`node:util.parseArgs` is the dependency-free alternative and handles `=`-form, booleans and strictness
for free. It is rejected because it emits `ERR_PARSE_ARGS_*` messages that this project would have to
map to its own text anyway: four chained cards assert the CLI's error strings verbatim, so the error
contract needs to be ours and stable across Node versions. The parse surface must also be extensible
three more times without a signature redesign or a rewrite of the siblings' tests.

## Decision

Hand-roll the parser in a pure `src/server/args.ts` — no runtime dependency and no
`node:util.parseArgs`. It exports `DEFAULT_BOARD_DIR`, `USAGE`, `EXIT_USAGE`, and two total pure
functions: `parseArgs(argv: string[]): {ok:true; args: CliArgs} | {ok:false; error: string}` over the
USER argv (`process.argv.slice(2)`), and `resolvePaths(args: CliArgs): ResolvedPaths`.

`parseArgs` never throws, never reads fs, and never touches `process`; unknown options and surplus
positionals are rejected with project-owned messages rather than silently ignored. Path resolution is
separated from token parsing, and the repo-relative value (`CliArgs.boardDir`) and the absolute served
path (`ResolvedPaths.boardDirPath`) are distinct fields on distinct types.

`index.ts` is pure wiring: parse → on `!ok` write `error` + `USAGE` to stderr and set
`process.exitCode = EXIT_USAGE` (64) → else resolve, `createServer`, `listen`.

## Consequences

Every flag is unit-testable without spawning a process or stubbing `process.argv`, and `index.ts` stays
coverage-excluded honestly. Error strings are ours, stable across Node versions, and safe to assert
exactly.

Each sibling card's **parser delta** is additive — one `CliArgs` field with a default, one `case` in
the token loop, one `USAGE` token — with no change to `parseArgs`' or `resolvePaths`' signatures:
CARD-025 adds `port: number`, CARD-026 adds `open: boolean`, and CARD-024 adds no parsing at all
(it consumes `ResolvedPaths.boardDirPath`). Note this additivity is a property of `args.ts`, **not** of
the sibling cards as a whole: because `index.ts` stays coverage-excluded, each sibling additionally
introduces its own tested module — `validate-board.ts` (CARD-024), `listen-with-retry.ts` (CARD-025),
`open-browser.ts` (CARD-026), as CARD-018's `slice.md` already budgets. The `.listen(4400,'127.0.0.1')`
call this card writes into `index.ts` is precisely the seam CARD-025 replaces.

Costs: strict rejection means an unimplemented sibling flag errors today (`unknown option: --port`,
exit 64) where the current `index.ts` silently ignores it — deliberate and test-pinned, flipped by the
card that implements it, but it means a user copying REQ-010's own usage line verbatim gets exit 64
until CARD-025/026 land. `--board-dir=value` (equals form) is NOT accepted, only the space form the
spec's usage line shows. This parser will never grow short flags, clustering, or `--` passthrough
without a follow-up decision.

## Status

Accepted.
