# CARD-018 — slice

## Verdict

**Split.** CARD-018 bundles four independently-shippable CLI behaviours (REQ-011
`--port`, REQ-012 `--board-dir`, REQ-013 `--no-open`, REQ-014 startup validation) that
intake grouped as "CLI flags and startup validation" after splitting them out of
CARD-006. Each is individually a clean vertical slice (own flag, own observable
behaviour, own test surface); nothing here shares an invariant that must land
atomically across two of them. Estimating from the real files (below) puts the
combined change at **~605 lines**, well over `size_limit` (500) — over 500 is
disqualifying regardless of how cohesive "CLI flags" feels as a single unit
(step 4 of the slice-phase doctrine: the size ceiling overrides a right-sized call).

This also matches the project's own calibration signal: CARD-006 (313→679) and
CARD-019 (300→601) both ran ~2-2.2x over their intake estimates. CARD-018's own
305-line intake estimate, taken at face value, would look "just under 500" — exactly
the kind of number the dispatch flagged as suspect.

## Proposed slices

Split **by acceptance criterion**, following card.md's own AC boundaries (which
already map 1:1 to REQ-011..014):

1. **CLI --board-dir flag** (REQ-012) — establishes the shared `args.ts` parser and
   the board-dir default/override. Placed first because every later flag extends the
   same parser and `index.ts` wiring.
2. **CLI startup validation** (REQ-014) — the "read before write" safety net; depends
   on knowing which board dir to check, so follows (1).
3. **CLI --port flag with auto-increment** (REQ-011) — orthogonal to board
   resolution/validation; a real-socket retry-on-EADDRINUSE module.
4. **CLI --no-open flag** (REQ-013) — the browser-open side effect; naturally last
   since it fires only after the server is already listening (i.e., after 1-3's
   concerns are settled).

All four stay in **M2** (CARD-018's milestone) and each also carries `CARD-006` in
`depends_on` (the HTTP server / index.ts entry point they extend). Siblings are
chained (2 depends on 1, 3 on 2, 4 on 3) rather than left parallel: all four touch
the same `args.ts` and `index.ts` files incrementally, and this project's established
pattern (http-server.ts extended sequentially across CARD-006/007/008) avoids
parallel-branch conflicts on shared files. None of the four requires a design change
to an earlier one's interface — each is additive to `args.ts`'s shape.

Each child stays firmly under 500 even applying this project's observed ~2x
intake-to-actual drift (worst case, child 3: 220 → ~440).

## Dependency rewiring

No card lists CARD-018 in `depends_on` — `dependents_rewire: []`.

## Size estimates

Current state: `src/server/index.ts` (24 lines) does positional-arg handling only
(missing repo path → usage + exit 64) and a hardcoded `PORT = 4400` /
`resolve(targetRepo, 'docs/cards')`. No `args.ts`, `validate-board.ts`,
`listen-with-retry.ts`, or `open-browser.ts` exist yet. Per [CARD-001], `index.ts`
stays outside unit-test coverage (I/O edge, proven by build+smoke) — its own diff
lines are counted but carry no test lines.

**1. CLI --board-dir flag — ~130**
| file | lines | notes |
|---|---|---|
| `src/server/args.ts` (new) | ~45 | positional targetRepo + `--board-dir <path>` parsing, default `docs/cards` |
| `src/server/args.test.ts` (new) | ~70 | default, explicit path, path forms, order-independence |
| `src/server/index.ts` (edit) | ~15 | wire `parseArgs`, replace hardcoded `resolve(targetRepo, 'docs/cards')` |

**2. CLI startup validation — ~125**
| file | lines | notes |
|---|---|---|
| `src/server/validate-board.ts` (new) | ~35 | exists-check + config.md/CARD-* presence check, returns message or null |
| `src/server/validate-board.test.ts` (new) | ~75 | missing dir, empty dir, config.md-only, CARD-*-only, neither, happy path |
| `src/server/index.ts` (edit) | ~15 | call validateBoard before createServer; stderr + non-zero exit on failure |

**3. CLI --port flag with auto-increment — ~220**
| file | lines | notes |
|---|---|---|
| `src/server/args.ts` (edit) | ~20 | add `--port <n>` parsing, default 4400 |
| `src/server/args.test.ts` (edit) | ~30 | default/explicit port cases |
| `src/server/listen-with-retry.ts` (new) | ~45 | listen; on EADDRINUSE increment + retry; resolves bound port |
| `src/server/listen-with-retry.test.ts` (new) | ~110 | real-socket occupancy of N ports, confirms next free port used; default success case (real-net-server test setup runs at the high end of this repo's ~2-5x test:code ratio, per http-server.test.ts) |
| `src/server/index.ts` (edit) | ~15 | wire port flag + listenWithRetry; update startup log |

**4. CLI --no-open flag and default browser launch — ~169**
| file | lines | notes |
|---|---|---|
| `src/server/args.ts` (edit) | ~12 | add `--no-open` boolean flag |
| `src/server/args.test.ts` (edit) | ~20 | flag present/absent cases |
| `src/server/open-browser.ts` (new) | ~40 | cross-platform spawn (darwin `open` / win32 `start` / linux `xdg-open`) |
| `src/server/open-browser.test.ts` (new) | ~85 | mocked `child_process.spawn`, one case per platform + no-open suppression |
| `src/server/index.ts` (edit) | ~12 | call openBrowser(url) after listen, unless noOpen |

**Total across the split: ~644 lines** (cross-checks the ~605-line whole-card
estimate within normal per-file rounding). All four children individually clear
`size_limit` with margin.

## Proposed cards (for the carve-out)

### 1. CLI --board-dir flag
- `type`: feature · `layer`: api · `estimated_lines`: 130 · `depends_on`: [CARD-006]
- Why: Lets the CLI point at a board that isn't at the default `docs/cards` path; also
  introduces the shared `args.ts` module every later flag card extends.
- Acceptance criteria:
  - `--board-dir` defaults to `docs/cards` when not passed (REQ-012)
  - `--board-dir <path>` parses and serves the board at that repo-relative path (not
    just the default) — a second fixture board at a non-default path proves the
    path-resolution half of REQ-012, not only the default (per card.md's intake finding)

### 2. CLI startup validation for a missing or non-board directory
- `type`: feature · `layer`: api · `estimated_lines`: 125 · `depends_on`: [1]
- Why: Fails clearly and early when the target repo isn't a kanban-flow board at all,
  instead of serving an empty/broken snapshot.
- Acceptance criteria:
  - A missing `<repo>/<board-dir>` exits non-zero with
    "no kanban-flow board found — run /kanban-init?" (REQ-014)
  - A board dir that exists but contains neither `config.md` nor any `CARD-*` directory
    exits with the same message and non-zero code (REQ-014)
  - A board dir containing `config.md` and/or a `CARD-*` directory passes validation and
    the server starts normally (happy path, REQ-014)

### 3. CLI --port flag with default and auto-increment
- `type`: feature · `layer`: api · `estimated_lines`: 220 · `depends_on`: [2]
- Why: Lets the operator pick a port, and keeps the CLI usable when the default 4400 is
  already taken instead of crashing.
- Acceptance criteria:
  - `--port` defaults to 4400 (REQ-011)
  - `--port <n>` binds the given port instead of the default (REQ-011)
  - When the selected port is already in use, the server auto-increments to the next
    free port instead of erroring out (REQ-011)

### 4. CLI --no-open flag and default browser launch
- `type`: feature · `layer`: api · `estimated_lines`: 169 · `depends_on`: [3]
- Why: Opens the board in a browser by default so the happy path needs no manual step,
  with an escape hatch for headless/CI use. Accepted rough edge (per card.md): this
  ships in M2 before CARD-009 (M3) serves `GET /`, so for the duration of M2 the default
  open lands on a 404 — deliberately accepted at intake rather than pulling CARD-009
  into the foundation milestone.
- Acceptance criteria:
  - By default, once the server is listening, the CLI opens the system default browser
    at the server's URL (REQ-013)
  - `--no-open` suppresses the browser open; the server still starts and logs its URL
    (REQ-013)
