# CARD-007 — Push live snapshots over SSE · slice (rework 1)

## Verdict
**Split into 4 children.** The prior 3-way split's overall shape and CARD-012 rewire were
independently reconstructed and accepted (`slice-check.md`: SLC-VERDICT, SLC-CHILD-AC,
SLC-NO-LOSS, SLC-REWIRE, SLC-DAG all pass) — kept as-is. Only child 2 ("push a fresh
snapshot to SSE clients on a board change") failed SLC-SIZE: an 8-14% margin under
`size_limit` (428-463 vs 500) on the child carrying this project's first non-gray-matter
runtime dependency (`chokidar`) and first real-filesystem async-event test, against this
repo's demonstrated 2x-2.2x slice-to-actual drift (CARD-006, CARD-019). This rework splits
that one child along the module/wiring seam the checker named, leaving the other two
children untouched in substance (only their headline arithmetic and `depends_on` shape are
corrected, per the advisory findings).

## Is the watcher-module/wiring seam a real vertical split, or scaffolding?
The risk named in the rework brief: a watcher that only calls a callback, with no consumer,
reads as scaffolding, not a shippable slice. This codebase already answered that question
once, the same way: `buildSnapshot()` (CARD-021, "Assemble a board snapshot from cards,
config and parse errors") shipped as its own card — a pure function with **zero HTTP
wiring**, its behaviour asserted entirely by calling it directly and inspecting the
returned object. `CARD-006` wired it into `GET /api/board` in a **later, separate** card.
That precedent was accepted (it is `done`, `right_sized: true`).

`watchBoard(options)` is the same shape: calling it against a real temp board dir and
mutating a file makes `onSnapshot` fire with a freshly-built, correct snapshot — directly
observable and directly asserted in `watcher.test.ts`, with no transport involved. It ships
real, user-relevant behaviour (the file-change-to-fresh-snapshot pipeline works, provably,
end to end at the module boundary) rather than an inert stub. The wiring-into-SSE child
that follows is the transport-adoption step, exactly mirroring CARD-006's role for
`buildSnapshot`. On that precedent this **is** a real slice, not scaffolding, and
SLC-CHILD-VERTICAL should hold on re-check.

## Proposed slices
1. **SSE endpoint sends the current snapshot on connect** (AC1/REQ-017) — unchanged in
   substance from the prior slice.md. Extends `http-server.ts`'s dispatch with
   `GET /api/events`: SSE headers, one `data: <json>\n\n` frame from the existing
   injectable `snapshot()`, and a subscribe/unsubscribe hub for connection lifecycle.
   **Scope note (addresses the advisory finding):** the hub also exposes a `publish`
   method with no caller in this child and no assertion in this child's own test suite —
   it is the seam slice 3 calls; a later design check should not treat `publish` as
   in-scope for this child's own coverage. Depends only on CARD-006.
2. **Watch the board directory for changes and produce a fresh snapshot** (part of
   AC2/REQ-006/REQ-008's re-parse clause) — adds `chokidar` (first non-gray-matter runtime
   dep) and a new `src/server/watcher.ts` wrapping it: `watchBoard(options)` →
   `buildSnapshot` → `onSnapshot(snapshot)`; `close()`. No HTTP/SSE involvement at all —
   tested entirely by direct invocation against a real temp fixture board (mirrors CARD-021's
   `buildSnapshot()` precedent, see above). Depends only on CARD-006 (reuses its
   `assertNoRepoWrites`/`assertNoNonLoopbackNetwork` guards from `test/server-guard.ts`).
3. **Push watcher snapshots to connected SSE clients on a board change** (rest of
   AC2/REQ-008's push clause, REQ-017) — wires slice 2's `watchBoard`'s `onSnapshot` into
   slice 1's `hub.publish` inside `index.ts`; one real-fs, real-SSE integration test proves
   the whole path (mutate a file → client receives the new frame). This is the transport
   adoption step for slice 2's module, exactly as CARD-006 was for `buildSnapshot()`.
   Depends on slices 1 and 2.
4. **Debounce rapid board changes into one live snapshot** (AC3/REQ-008's debounce clause)
   — unchanged in substance from the prior slice.md: wraps the watcher's change handler in
   a ~200 ms debounce (injectable clock; fake timers for the unit test) and adds a
   real-filesystem burst integration test (multiple files written <200 ms apart → exactly
   one SSE event reflecting the final state) — the card's "self-healing" Note, made
   concrete. Depends on slice 3.

REQ-001 (chokidar can be configured to write) is not asserted by slice 1 (no chokidar yet);
slices 2, 3 and 4 must wrap their fs/network-touching exercises in `test/server-guard.ts`'s
`assertNoRepoWrites`/`assertNoNonLoopbackNetwork`, per CARD-006's ADR-0011.

## Dependency rewiring
- **CARD-012** (`depends_on: [CARD-009, CARD-007]`) → `[CARD-009, "Debounce rapid board
  changes into one live snapshot"]`. Unchanged from the prior slice.md's rewire target:
  CARD-012's AC2 ("the board re-renders from each snapshot received on the SSE stream")
  needs live, debounced updates, so it depends on the terminal child, which transitively
  requires slices 1-3.

## Size estimates

### Slice 1 — SSE endpoint sends the current snapshot on connect (~195)
| file | est. lines | notes |
|---|---|---|
| `src/server/http-server.ts` | +65 | SSE hub (subscribe/unsubscribe/publish, ~20), `GET /api/events` route handler (headers + initial frame, ~20), JSDoc (~15), option plumbing (~10) |
| `src/server/http-server.test.ts` | +130 | SSE-frame-reading helper (~20), headers/content-type test (~25), payload-equals-`buildSnapshot` test (~30), two-concurrent-connections test (~25), clean-close-doesn't-hang test (~30) |
| `tsconfig.test.json` | 0 | `http-server.ts` already included |
| **Sum** | **195** | matches headline |

### Slice 2 — Watch the board directory for changes and produce a fresh snapshot (~248)
| file | est. lines | notes |
|---|---|---|
| `src/server/watcher.ts` (new) | +75 | `watchBoard(options)` wraps `chokidar.watch(boardDir, {ignoreInitial:true})`; add/change/unlink/addDir/unlinkDir → `buildSnapshot` → `onSnapshot`; `close()`; JSDoc |
| `src/server/watcher.test.ts` (new) | +170 | temp-dir fixture (reusing `writeFixtureBoard`, per `build-snapshot.test.ts`'s pattern), wait-for-ready helper, change/add/unlink each trigger `onSnapshot` with correct data, `assertNoRepoWrites` wrap, `close()` stops further events |
| `tsconfig.test.json` | +2 | add `watcher.ts` to `include` (KNOWLEDGE [CARD-019]: non-test source files must be listed explicitly; confirmed against the live file — `**/*.test.ts` is auto-included, non-test files are not) |
| `package.json` | +1 | `chokidar` runtime dependency (`package-lock.json` is `size_exclude`) |
| **Sum** | **248** | matches headline |

### Slice 3 — Push watcher snapshots to connected SSE clients on a board change (~187)
| file | est. lines | notes |
|---|---|---|
| `src/server/index.ts` | +22 | construct `watchBoard(...)`, wire `onSnapshot → hub.publish`, close watcher+server on SIGINT/SIGTERM |
| integration test (new `src/server/live-events.test.ts`, matches existing `**/*.test.ts` include — no tsconfig change) | +165 | wire real `watchBoard` + `createServer` (with slice 1's hub) together, connect, read initial event, mutate a card file, read second event via a reader loop, assert updated content, REQ-001 guard wrap, teardown (watcher + server + abort open connections) |
| **Sum** | **187** | matches headline |

### Slice 4 — Debounce rapid board changes into one live snapshot (~240)
| file | est. lines | notes |
|---|---|---|
| `src/server/watcher.ts` | +40 | wrap the change handler in a ~200 ms debounce, injectable delay/clock for deterministic tests |
| `src/server/watcher.test.ts` | +90 | fake-timer unit test: N triggers inside the window collapse to one call with the latest state after the window elapses |
| `src/server/live-events.test.ts` | +110 | real burst: write 3 files <200 ms apart, wait past the debounce window, assert exactly one SSE event reflecting the final combined state (the card's "self-healing" Note) |
| **Sum** | **240** | matches headline |

All four children now sit well clear of `size_limit` (39-63% under, vs. the failed child's
prior 8-14%), including headroom against this repo's demonstrated slice-to-actual drift.

## Proposed cards (for the carve-out)

### 1. SSE endpoint sends the current snapshot on connect
- `type`: feature · `layer`: api · `estimated_lines`: 195 · `depends_on`: [CARD-006]
- Why: A client can open a live connection and immediately see the current board, priming the
  live view before any change ever occurs.
- Acceptance criteria:
  - `GET /api/events` emits the full snapshot once on connect (REQ-017)
  - The connection stays open (no immediate close) and a second, independent connection also
    receives its own current snapshot
- Scope note (not an acceptance criterion): the subscribe/unsubscribe hub built here also
  exposes a `publish` method with no caller and no assertion in this child's own tests — it is
  the seam child 3 uses to broadcast.

### 2. Watch the board directory for changes and produce a fresh snapshot
- `type`: feature · `layer`: api · `estimated_lines`: 248 · `depends_on`: [CARD-006]
- Why: The moment a card file changes on disk, a correct, freshly re-parsed snapshot of the
  whole board is produced — the foundation live updates are built on, directly observable by
  calling the watcher and inspecting what it reports, independent of any transport.
- Acceptance criteria:
  - Changing a card file under `board_dir` causes `watchBoard`'s `onSnapshot` callback to fire
    with a freshly re-parsed, correct full snapshot (REQ-006, REQ-008 re-parse clause)
  - `close()` stops further watch events (no leaked fs watcher)

### 3. Push watcher snapshots to connected SSE clients on a board change
- `type`: feature · `layer`: api · `estimated_lines`: 187 · `depends_on`: [1, 2]
- Why: The board updates automatically for anyone with the page open, the moment a card file
  changes on disk — no reload.
- Acceptance criteria:
  - Changing a card file under `board_dir` pushes a new full snapshot to every connected
    `/api/events` client (REQ-008 push clause, REQ-017)

### 4. Debounce rapid board changes into one live snapshot
- `type`: feature · `layer`: api · `estimated_lines`: 240 · `depends_on`: [3]
- Why: A burst of file writes (e.g. a multi-file card move) reaches connected clients as one
  correct snapshot instead of a flicker of partial ones.
- Acceptance criteria:
  - Changes are debounced ~200 ms, so a multi-file write emits one correct snapshot rather than
    a burst (REQ-008)
