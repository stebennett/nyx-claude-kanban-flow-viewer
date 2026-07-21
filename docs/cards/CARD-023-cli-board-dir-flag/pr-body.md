## CARD-023 — design: CLI --board-dir flag   [feature · api]

### Why
The CLI currently hardcodes `resolve(targetRepo, 'docs/cards')`. REQ-012 says the board location is a
repo-relative flag defaulting to `docs/cards`. This card makes that real — and in doing so establishes
`src/server/args.ts`, the pure CLI-parsing module that CARD-024 (validation), CARD-025 (`--port`) and
CARD-026 (`--no-open`) each extend. It is the first of CARD-018's four children.

### Design summary
- **`src/server/args.ts` is pure**: no fs, no `process`, no throw. `parseArgs(argv)` takes the *user*
  argv (`process.argv.slice(2)`) and returns a discriminated `{ok:true,args} | {ok:false,error}`.
  Unknown options and surplus positionals are rejected with project-owned messages, never ignored.
- **The two board paths get two names on two types.** `CliArgs.boardDir` is the repo-relative flag
  value; `ResolvedPaths.boardDirPath` is the absolute path `ServerOptions.boardDir` requires.
  `resolvePaths` is the single conversion point, so the two can't be swapped silently. It also derives
  `projectName` from the *repo* basename, never the board dir's — which stays correct when
  `--board-dir` points elsewhere.
- **AC-2 is proven end-to-end by ONE temp repo carrying TWO boards** (`docs/cards` with CARD-001/wip 2,
  `boards/alt` with CARD-777/wip 7). The default run serves the first, `--board-dir boards/alt` serves
  the second. Hardcoding `docs/cards` reddens it; a single-fixture test could not tell the difference.
- **`index.ts` stays pure wiring** (parse → resolve → `createServer` → `listen`) because it is the
  coverage-excluded I/O edge — that is why no flag behaviour lives there.
- **A shared test harness moves to `test/board-fixture.ts`** (`writeFixtureTree`/`withServer`/
  `cleanupFixtures`), out of `http-server.test.ts` where it is unreachable by other files. All four
  sibling cards need it; this is the existing `test/server-guard.ts` pattern, not new infrastructure.

### Acceptance criteria (sharpened)
- **AC-1 (REQ-012, `docs/spec.md:99-102`)** — with no `--board-dir`, the served board is
  `<repo>/docs/cards`: `args.boardDir === 'docs/cards'`, `boardDirPath === '<repo>/docs/cards'`, and
  `GET /api/board` returns the default board's ids and `config.wipLimit`.
- **AC-2 (REQ-012, `docs/spec.md:99-102`; REQ-010 usage form, `:87-92`)** — `--board-dir <path>` parses
  *and* the board at that repo-relative path is what gets served: against the two-board fixture,
  `GET /api/board` returns `['CARD-777']` / `wipLimit 7` and **not** `CARD-001` / `wipLimit 2`.

### ADRs in this PR
- **ADR-0012 — CLI flags parsed by a hand-rolled pure args module returning a discriminated result.**
  No runtime dependency (ADR-0002/ADR-0005 keep deps at exactly `{gray-matter}`) and not
  `node:util.parseArgs`, because four chained cards assert the CLI's error strings verbatim and the
  error contract needs to be ours and stable across Node versions.

### Open questions / decisions deferred
The designer raised none. Two things the design check surfaced that are worth a reviewer's eye:

1. **Size.** The design implies ~410 lines against the card's carve-time `estimated_lines: 130` — a
   3.2x delta, re-derived independently by the checker with per-file working. It is not scope creep
   (every task maps to an AC); the carve-time figure priced `args.test.ts` at ~70 with no server-level
   test, while AC-2 mandates a two-board proof through the real server. `estimated_lines` is
   deliberately left at 130 so the miss stays visible to `/retro`. ~410 is 18% under `size_limit` 500,
   but this project has twice run ~2x its design-time figure. If trimming is wanted, the checker named
   task 4's property pair (~30 lines) as the only work not tied to an AC.
2. **A user-visible interval inside M2.** Strict rejection means `--port` and `--no-open` — both
   advertised on REQ-010's own usage line — return `unknown option` and exit 64 until CARD-025/026
   land, where today's `index.ts` silently ignores them. Deliberate, test-pinned and ADR-recorded;
   failing loud beats silently serving the wrong port.

The design check verdicted **pass** on all eight `DSG-*` criteria (`DSG-KNOWLEDGE` fails at advisory
severity, which does not gate: the design doesn't name the `noUncheckedIndexedAccess` dead-branch trap
that an argv token loop invites). Seven advisories in total ride this PR — see
`docs/cards/CARD-023-cli-board-dir-flag/design-check.md`. Two of them concerned ADR text that would
land permanently on `main`, and were applied when routing ADR-0012: an unverifiable Node-stability
claim was removed, and the "each sibling card is additive" wording was scoped to `args.ts`'s parser
surface, since CARD-024/025/026 each additionally introduce their own tested module.

Full design: `docs/cards/CARD-023-cli-board-dir-flag/design.md` (in this diff). Merging this PR
approves the design and unblocks implementation — the implementation branch is cut from main after
this merges, and the code arrives as a second PR.

🤖 Design delivered via /kanban
