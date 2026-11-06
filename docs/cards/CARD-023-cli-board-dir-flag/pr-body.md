## CARD-023 — CLI `--board-dir` flag   [feature · api]

Implements REQ-012. Replaces the hardcoded `resolve(targetRepo, 'docs/cards')` with a real flag, and
establishes `src/server/args.ts` — the pure CLI-parsing module CARD-024/025/026 each extend.

Design PR **#61** (ADR-0012) merged first; this is the implementation half.

### What changed
| file | |
|---|---|
| `src/server/args.ts` | **new**, 108 lines — `parseArgs(argv)` → `{ok:true,args} \| {ok:false,error}`, `resolvePaths(args)`, the five error strings, `USAGE`, `EXIT_USAGE` |
| `src/server/args.test.ts` | **new**, 285 lines — 23 tests incl. two seeded properties and the two-board end-to-end proof |
| `test/board-fixture.ts` | **new**, 52 lines — `writeFixtureTree`/`cleanupFixtures`/`withServer`, moved verbatim out of `http-server.test.ts` |
| `src/server/index.ts` | now pure wiring: parse → resolve → `createServer` → `listen` |
| `src/server/http-server.test.ts` | imports the shared harness; its 6 tests unchanged in substance |
| `tsconfig.test.json` | `args.ts` added to `include` (TS6307) |

**Size: `actual_lines: 518` (463 added + 55 deleted) against `size_limit` 500 — an 18-line (3.6%) breach.** Earlier revisions of this doc said "463 added lines against 500" and framed it as compliance. That was wrong: `checks/deliver.md` measures `added + deleted`. The "added-column precedent" cited from CARD-019/CARD-021 does not exist: CARD-021 had zero deletions, and CARD-019's 5 deletions were too few to change its outcome under either measure (596 added-only vs 601 added+deleted — both over 500). Neither card ever exercised the distinction. Breach disclosed, not concealed; `DLV-SIZE` is advisory-escalated, and a concrete split is proposed in `deliver-check.md`.

### How AC-2 is actually proven
The card's AC-2 is intake-mandated: the flag must *parse* **and** the board at that path must be
**served**. A single-fixture test cannot tell a working flag from a hardcoded path — so the proof uses
**one temp repo holding two boards**, disjoint on two axes:

| | default (`docs/cards`) | `--board-dir boards/alt` |
|---|---|---|
| card id | `CARD-001` | `CARD-777` |
| `wipLimit` | 2 | 7 |

Neither value is `DEFAULT_WIP_LIMIT` (3), so a "config not found, fell back" degradation is
distinguishable from a wrong-board read. Both fixtures carry real `---` frontmatter fences — without
them gray-matter returns `{}` and the discriminator silently collapses.

The recorded mutation (hardcode `DEFAULT_BOARD_DIR` inside `resolvePaths`) reddens it with
`expected [ 'CARD-001' ] to deeply equal [ 'CARD-777' ]`. That is precisely the mutation a
single-fixture test would have survived.

### Verification
- **Gates**, re-run independently at test phase: lint 0, `tsc -b --noEmit` 0, build 0, **151/151 tests**,
  coverage `100/98.3/100/100` overall with **`args.ts` at 100 on all four**.
- **Review: full 8-lens panel, zero blocking findings.** Four lenses verified by *execution* — acceptance
  ran four mutations and smoked the built CLI; functionality probed the compiled module with hostile
  argv; tests traced three mutations against the end-to-end pair; security confirmed the loopback bind
  survived the rewrite.
- **`index.ts` is coverage-excluded**, so its only evidence is a manual smoke: `--board-dir boards/alt`
  served `CARD-777`/wip 7, the default served `CARD-001`/wip 2, `projectName` stayed the repo-root
  basename in both, and both error paths printed usage with exit 64. Reproduced independently in review.

### 14 advisories ride this PR
Full detail in `docs/cards/CARD-023-cli-board-dir-flag/review.md`. The four worth a reviewer's eye:

1. **`test/board-fixture.ts` has no test, and the design's mutation claim about it is false.** The helper
   sits outside both `test.include` and coverage's `include`. `design.md` claims "break `withServer`'s
   cleanup → the suite fails"; it doesn't — `splice(0)` → `slice(0)` leaks every fixture dir with all 151
   tests green, because `rmSync` is `force: true`. **CARD-024/025/026 all inherit this helper.** Strongest
   candidate for a follow-up defect card.
2. **An empty-string positional is accepted.** `parseArgs([''])` returns `ok` and `resolvePaths` maps `''`
   → `process.cwd()`, so `kanban-flow-viewer "$REPO"` with an unset `REPO` silently serves the *current
   directory's* board. Matches the approved error contract (which enumerates five strings and omits this),
   so not a rework item — **routed to CARD-024**, whose REQ-014 validation does *not* close it when the
   CWD is itself a valid board.
3. **`CliArgs.boardDir` and `ServerOptions.boardDir` share a name and type**, so a future call site that
   skips `resolvePaths` would type-check and silently serve a cwd-relative path. Today's single call site
   is correct; CARD-024/025/026 all re-touch that wiring.
4. **ADR-0012's "one case per sibling" is optimistic for `--port`** — a value-taking numeric flag needs the
   shared value-consumption block to branch on which flag is pending, plus a parse-failure mode that block
   has no slot for. CARD-025's design should budget for it.

Two more point at this card's own records rather than the code: `implement.md` renumbers the design-check
advisories (so "was advisory 5 actioned?" lands on the wrong line), and its smoke transcript is written in
a form that never returns when replayed literally. Both are recorded in `review.md`.

🤖 Delivered via /kanban
