# CARD-027 — SSE endpoint sends the current snapshot on connect · design

## Intent
Extend the existing `node:http` server (ADR-0010) with `GET /api/events`: a Server-Sent-Events
stream that, the moment a client connects, emits the current board snapshot as one
`data: <json>\n\n` frame and then **stays open**. This is REQ-017's "(and once on connect)"
clause only — the "on every change" clause is CARD-029's. It also lands the connection registry
(`SnapshotHub`) that CARD-029 broadcasts through.

## Acceptance criteria
- **AC-1 (REQ-017, `docs/spec.md:128-132`).** `GET /api/events` against a running server responds
  `200` with `content-type: text/event-stream; charset=utf-8` and `cache-control: no-cache,
  no-transform`, and the first bytes on the stream are exactly one frame `data: <json>\n\n` whose
  `<json>` parses to a value deep-equal to `buildSnapshot({boardDir, projectName, now})` for that
  board (REQ-019 shape, `docs/spec.md:141-153`). Observable: connect over `fetch` to a `:0` server
  on a temp fixture board, read until the first `\n\n`, compare against a direct `buildSnapshot`
  call with the same fixed `now`, plus fixture-derived cross-checks (`projectName`, card ids,
  `config.wipLimit`) computed without the server.
- **AC-2 (REQ-017 + card AC2).** The response is not ended after the initial frame, and two
  concurrent connections each receive their own current snapshot. Observable: (a) after reading
  frame 1, a further bounded read (150 ms) rejects with the *timeout* error and **not** with the
  *stream-ended* error — proving no EOF; (b) with connection 1 still open, opening connection 2
  yields its own complete, correct frame and `hub.subscriberCount === 2`.
- **AC-3 (lifecycle hygiene, enabling REQ-034 `docs/spec.md:261-265`).** A client disconnect
  unsubscribes it: after closing both connections, `hub.subscriberCount` returns to `0` within a
  bounded poll. Without this, CARD-029's `publish` would write to dead sockets forever.
- **AC-4 (ADR-0010 error contract).** A `snapshot` provider that throws yields `500`
  `{"error":"internal error"}` on `/api/events` with no leak of the thrown message and no
  partially-written SSE response.

## In scope
- `src/server/http-server.ts`: `GET /api/events` dispatch branch; `SSE_HEADERS`; `formatFrame`;
  `createSnapshotHub()` + the `SnapshotHub`/`FrameSink` types; `ServerOptions.hub?`.
- `src/server/http-server.test.ts`: the `openSse` frame-reading helper, an `afterEach` connection
  sweep, `server.closeAllConnections()` in the existing `withServer`, and the five new tests.
- `hub.publish` is **written but neither called nor asserted in this card** (slice-sanctioned; see
  Dependencies & assumptions).

## Out of scope
- chokidar, `watchBoard`, any filesystem watching → **CARD-028**.
- Actually pushing a change to connected clients (calling `publish`), and the `index.ts` wiring
  that constructs a hub and hands it to both halves → **CARD-029**.
- The ~200 ms debounce → **CARD-030**.
- SSE heartbeat/comment pings, `retry:` hints, `event:` names, `id:`/Last-Event-ID replay,
  per-client diffing, back-pressure handling and dead-socket pruning — none are required by
  REQ-017/REQ-034 and full snapshots make replay meaningless (see Proposed ADRs).
- The browser client, connection dot and re-sync behaviour → **CARD-012**.
- Any change to `GET /api/board`, the 404 contract, `index.ts`, `tsconfig.test.json` (`http-server.ts`
  is already on line 19 of its `include`), `package.json` (no new dependency).

## Dependencies & assumptions
- **CARD-006 (merged)** provides `createServer(options): Server` returning an *unlistened* server
  (ADR-0010), the injectable `snapshot?: () => BoardSnapshot` used verbatim here, the
  `{"error":"internal error"}` 500 contract, and the `withServer`/`writeFixtureBoard` helpers.
  Both helpers are **local to `http-server.test.ts` and not exported** — the new tests live in that
  same file, so they are used directly with no import and no re-implementation.
- `buildSnapshot` is total (ADR-0008); `BoardSnapshot` is the dependency-free contract in
  `card-model.ts` ([CARD-021]) and is imported as a type only.
- Node ≥20, ESM (ADR-0001): `server.closeAllConnections()` (≥18.2), global `fetch`/undici, web
  `ReadableStream` readers and `AbortController` are all available. Node's `keepAliveTimeout` (5 s)
  applies to *idle* connections between requests and does not kill an in-flight streaming response;
  `server.requestTimeout` bounds request *receipt*, not response duration — so no server-side timer
  truncates an SSE stream by default.
- vitest 3 (`expect.poll(fn, {interval, timeout})`, available since 2.1) and its default 5 000 ms
  test timeout; every in-test wait designed here is ≤2 000 ms so the test's own error always wins.
- **`publish` has no caller and no assertion in this card** (`slice.md:38-41`, `card.md:47-50`,
  accepted at slice-check). It is one ~4-line function; a design/review/coverage check must not read
  it as dead code. Coverage impact: 1 uncovered function out of ~40 in `src/server/**` (~97%) and
  ~4 uncovered lines out of ~450 — the 90% thresholds (`vite.config.ts:17-22`) hold with room.
- No REQ-001 acceptance claim is made here (no chokidar yet, per `card.md:52-53`), but per ADR-0011
  the main connect test still wraps its exercise in `assertNoRepoWrites`/`assertNoNonLoopbackNetwork`.

## Approach
**Server.** One new dispatch branch beside `GET /api/board`, reusing the `snapshot` provider already
resolved at the top of `handleRequest`:

```
GET /api/events → snapshot()            // may throw → 500 JSON, headers not yet sent
                → writeHead(200, SSE_HEADERS)
                → res.write(formatFrame(current))   // flushes headers with the frame
                → const off = hub.subscribe(res)
                → res.on('close', off)              // response stays open
```

Calling `snapshot()` **before** `writeHead` is load-bearing: it is the only realistic thrower, so the
catch can still emit the ADR-0010 JSON 500 rather than crashing on ERR_HTTP_HEADERS_SENT (an
uncaught throw inside a `node:http` request listener takes the process down). `flushHeaders()` is
deliberately *not* called — headers ride out with the initial frame, so deleting the frame reddens
the header test too rather than leaving it silently green.

The hub is a `Set<FrameSink>` where `FrameSink = { write(chunk: string): unknown }` — the narrowest
type the hub needs, structurally satisfied by `ServerResponse`. `publish` serializes **one** frame
and writes it to every sink (no per-connection closure, so the connect path carries no uncovered
arrow function). It is injectable via `ServerOptions.hub` and defaults to one `createSnapshotHub()`
per `createServer` call — never per request, which would give each connection a private hub and
silently break CARD-029.

**Framing.** `JSON.stringify` escapes every newline as `\n`, so no board content (a card title with an
embedded newline, a CRLF-checked-out file — [CARD-022]) can ever inject a premature `\n\n` and split
a frame. That invariant is asserted with a newline-bearing fixture title rather than assumed.

**Tests — how one frame is read without hanging (the main design risk).** `openSse(baseUrl)` wraps
`fetch` with `signal` from an `AbortController` and returns an `SseConnection`:
- The *connect* await is bounded: a `setTimeout` aborts the controller after 2 000 ms and is cleared
  in `finally`, so a server that sets headers but never writes fails fast instead of hanging.
- `nextFrame(timeoutMs = 2000)` pumps the body reader into a string buffer until it contains `\n\n`,
  then splits off and returns the first frame's **raw text** (so tests assert the literal `data: `
  prefix, not a pre-parsed object). Chunk boundaries are arbitrary under chunked transfer-encoding,
  hence the buffer loop. It rejects with two *distinguishable* messages: `SSE read timed out after
  Nms` and `SSE stream ended before a complete frame`. That distinction is what makes "the
  connection stays open" a real assertion: `rejects.toThrow(/timed out/)` passes only if there was
  no EOF. A timed-out read keeps its pending `read()` promise for reuse, so no chunk is ever lost.
- `close()` calls `reader.cancel()` **then** `controller.abort()` (that order avoids an unhandled
  AbortError on a pending read) and attaches a no-op `.catch()` to any abandoned read promise.
- Every connection `openSse` creates is pushed to a module-level array swept by an `afterEach`
  (mirroring the existing `tmpDirs` sweep), because vitest abandons a timed-out test's promise chain
  and its `finally` never runs — `afterEach` still does.
- `withServer`'s `finally` gains `server.closeAllConnections()` before awaiting `close()`:
  `server.close()` waits for in-flight responses, so a single open SSE socket would otherwise hang
  the file forever. Existing request/response tests are unaffected (idempotent no-op for them).

**Alternatives considered.**
(a) *Read the stream with raw `node:http.get` + `IncomingMessage` `'data'` events instead of `fetch`.*
Rejected: the file's five existing tests all use `fetch`, and ADR-0011's network guard is already
proven against undici's connect shape ([CARD-006]). Keep as the documented fallback if undici stream
cancellation ever proves flaky.
(b) *An `EventSource` polyfill / third-party SSE client in tests.* Rejected: a new devDependency to
parse a two-line protocol, and it hides exactly the wire-format details AC-1 must assert.
(c) *`createServer` returns `{ server, hub }`.* Rejected: breaks ADR-0010's `createServer(options):
Server` signature, `index.ts` and all five existing tests, for no gain over injecting the hub.
(d) *No hub at all in this card — just write the frame and end nothing.* Rejected: the unsubscribe
path would be untestable and CARD-029 would have to retrofit connection tracking into a shipped
endpoint; the slice explicitly places the hub here.
(e) *A generic `nextFrame()` with no timeout, relying on vitest's 5 s test timeout.* Rejected: a
vitest timeout abandons the chain, so servers and sockets leak and the whole file's teardown can
hang — the exact CI poisoning this card must avoid.

## Interfaces
```ts
// src/server/http-server.ts — additions (exported)

/** The narrowest thing a frame can be written to. `http.ServerResponse` satisfies it. */
export interface FrameSink {
  write(chunk: string): unknown;
}

/** Registry of connected SSE clients. Exactly one instance per `createServer` call. */
export interface SnapshotHub {
  /** Registers `sink`; the returned function removes it (safe to call twice). */
  subscribe(sink: FrameSink): () => void;
  /**
   * Broadcasts one `data: <json>\n\n` frame to every subscriber.
   * CARD-029's seam: NO caller and NO assertion in CARD-027 — deliberate, not dead code.
   */
  publish(snapshot: BoardSnapshot): void;
  /** Live subscriber count — the observable for connect/disconnect lifecycle. */
  readonly subscriberCount: number;
}

export function createSnapshotHub(): SnapshotHub;

export interface ServerOptions {
  boardDir: string;
  projectName: string;
  now?: () => Date;
  snapshot?: () => BoardSnapshot;
  hub?: SnapshotHub; // NEW — default: one createSnapshotHub() per createServer call
}

export function createServer(options: ServerOptions): Server; // signature unchanged (ADR-0010)
```
Module-private: `const SSE_HEADERS = { 'content-type': 'text/event-stream; charset=utf-8',
'cache-control': 'no-cache, no-transform' }`; `formatFrame(snapshot: BoardSnapshot): string` →
`` `data: ${JSON.stringify(snapshot)}\n\n` ``; `handleEvents(snapshot, hub, res): void`.

```ts
// src/server/http-server.test.ts — additions (file-local)
interface SseConnection {
  readonly status: number;
  readonly headers: Headers;
  /** Next complete frame's raw text, `\n\n` stripped. Rejects `SSE read timed out after Nms`
   *  or `SSE stream ended before a complete frame`. */
  nextFrame(timeoutMs?: number): Promise<string>;
  close(): Promise<void>;
}
async function openSse(baseUrl: string, pathname?: string): Promise<SseConnection>;
```
`res.body` is null-checked with an explicit `throw` (no `!`), matching the file's style.

## Data flow
`GET /api/events` → dispatch on `(method, pathname)` → `snapshot()` (injected, else
`buildSnapshot({boardDir, projectName, now})` reading `board_dir` from disk, parse failures already
inside `parseErrors`) → `writeHead(200, SSE_HEADERS)` → `res.write('data: ' + JSON.stringify(s) +
'\n\n')` → `hub.subscribe(res)` → `res.on('close', unsubscribe)`. Response stays open; nothing else
is ever written in this card. No schema, no migration, no persistence, no writes to the target repo,
no outbound sockets (REQ-001, `docs/spec.md:13-16`).

## Implementation task list
All work is in `src/server/http-server.ts` (modify) and `src/server/http-server.test.ts` (modify).
No other file changes. Each task: write the failing test, `npx vitest run src/server/http-server.test.ts`
(red), implement, re-run (green), `npm run lint && npm run typecheck`, commit.

1. **Connect handshake: status + SSE headers.**
   Test `GET /api/events responds 200 text/event-stream and holds the connection`: add `openSse`
   (bounded connect, buffered `nextFrame`, `close`), the module-level `openConnections` array +
   `afterEach` sweep, and `server.closeAllConnections()` in `withServer`'s `finally`. Fixture: the
   existing `writeFixtureBoard({'config.md', 'CARD-001-first/card.md', 'CARD-002-second/card.md'})`,
   `now: FIXED`. Assert `conn.status === 200`,
   `conn.headers.get('content-type') === 'text/event-stream; charset=utf-8'`,
   `conn.headers.get('cache-control') === 'no-cache, no-transform'`; `finally` → `await conn.close()`.
   Red (404 JSON today). Implement: `SSE_HEADERS`, `formatFrame`, the dispatch branch calling
   `snapshot()`, `writeHead`, and one `res.write(formatFrame(...))`. Verify all 5 pre-existing tests
   still pass.
2. **Initial frame is the current snapshot, and the stream stays open.**
   Test `emits exactly one data: frame equal to buildSnapshot and does not end the stream`, wrapped in
   `assertNoNonLoopbackNetwork(() => assertNoRepoWrites(boardDir, () => ...))` per ADR-0011. Assert:
   `frame.startsWith('data: ')`; `frame.slice(6).includes('\n') === false`;
   `JSON.parse(frame.slice(6))` `.toEqual(buildSnapshot(options))`; independently `body.projectName
   === 'fixture-project'`, `body.cards.map(c => c.id)` contains `CARD-001` and `CARD-002`,
   `body.config.wipLimit === 2`; then `await expect(conn.nextFrame(150)).rejects.toThrow(/timed out/)`.
   Green after task 1's write only if the frame is correctly formatted and the response is not ended.
   Then append the edge test `a card title containing a newline does not split the frame` (fixture
   card with `title: "line one\nline two"`): still exactly one frame, and
   `JSON.parse(...).cards[0].title` contains `'\n'`. This one is green on arrival — verify it by
   mutation instead: change `formatFrame` to a single `\n` terminator and to a non-stringified
   interpolation; both must redden it.
3. **Two concurrent connections, each with its own snapshot.**
   Test `a second connection receives its own current snapshot while the first is still open`:
   `const hub = createSnapshotHub()`, `withServer({...options, hub}, ...)`; open A, read frame A, open
   B, read frame B; assert both parse `.toEqual(buildSnapshot(options))`, that they are two distinct
   `SseConnection`s both still open (`await expect(connA.nextFrame(150)).rejects.toThrow(/timed out/)`),
   and `expect(hub.subscriberCount).toBe(2)`; close both in `finally`. Red (no `createSnapshotHub`,
   no `hub` option). Implement `createSnapshotHub` (with `publish` — the CARD-029 seam, no caller and
   no assertion here, per the scope note), the `hub?: ServerOptions` field, `const hub = options.hub ??
   createSnapshotHub()` **inside `createServer`** (once per server), and `hub.subscribe(res)` on connect.
4. **Disconnect unsubscribes.**
   Test `closing a connection removes it from the hub`: injected hub, open A and B, read both frames,
   `expect(hub.subscriberCount).toBe(2)`; `await connA.close()`; `await expect.poll(() =>
   hub.subscriberCount, {interval: 20, timeout: 2000}).toBe(1)`; `await connB.close()`; poll `.toBe(0)`.
   Red (nothing ever unsubscribes). Implement `res.on('close', unsubscribe)`.
5. **500 contract on `/api/events`.**
   Test `a throwing snapshot provider yields 500 {error:"internal error"} on /api/events`: plain
   `fetch` (the response ends, so no `openSse`), `snapshot: () => { throw new Error('boom') }`; assert
   `status === 500`, `content-type === 'application/json; charset=utf-8'`, body text
   `not.toContain('boom')`, parsed `.toEqual({error: 'internal error'})`. Red (uncaught throw). Implement
   the try/catch around the events branch with `snapshot()` evaluated **before** `writeHead`.
6. **Docs + gate sweep.** JSDoc on `createServer` (both routes), `createSnapshotHub`, `SnapshotHub`
   (including the explicit "CARD-029 seam, intentionally uncalled here" note on `publish`). Run
   `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, `npm run test:coverage`; paste
   real output. Commit.

## Test strategy
- **Gates:** `eslint .`, `tsc -b --noEmit` ([CARD-001] — never plain `tsc --noEmit`), `npm run build`,
  `vitest run`, and `vitest run --coverage` ≥90% lines/functions/branches/statements over
  `src/server/**/*.ts` minus `index.ts` and `**/*.test.ts`.
- **Coverage of the new code:** `formatFrame`, `SSE_HEADERS`, the dispatch branch, `subscribe`, the
  returned unsubscribe, the `subscriberCount` getter and the 500 catch are all exercised by tasks 1–5.
  The `options.hub ?? createSnapshotHub()` `??` gets both arms: tasks 1–2 and the five pre-existing
  tests omit `hub`; tasks 3–4 inject one. **`publish` is the sole intentionally-uncovered function**
  (see Dependencies & assumptions for the arithmetic) — CARD-029 covers it.
- **Independently computed expected values:** the frame payload is deep-equaled against a *direct*
  `buildSnapshot(options)` call (same fixed `now`) AND cross-checked against fixture-derived literals
  (`'fixture-project'`, `['CARD-001','CARD-002']`, `wipLimit === 2`) that never pass through the
  server, so a hardcoded or empty payload fails. Header and framing strings are asserted as literals,
  never rebuilt from the implementation's constants.
- **Design-named contract details asserted:** `200`; `text/event-stream; charset=utf-8`;
  `no-cache, no-transform`; the literal `data: ` prefix; exactly one `\n\n` terminator; no raw newline
  inside the data line; `500` + `{"error":"internal error"}` + no `'boom'` leak;
  `subscriberCount` 2 → 1 → 0.
- **Negative / edge cases:** stream must NOT end after the first frame (distinguishable timeout vs
  stream-ended errors); a card title containing a newline must not split the frame; a throwing
  provider must not produce a half-written SSE response; two connections must be independent.
- **Determinism:** fixed `now`, `:0` ephemeral ports, loopback only, no chokidar/timers under test,
  no network. Every wait is bounded ≤2 000 ms (< vitest's 5 000 ms default) and every server, socket
  and temp dir is released in a `finally` plus an `afterEach` sweep.
- **No property test earns its keep here:** the only invariant is frame integrity over snapshot
  content, and `formatFrame` is module-private; a fast-check run over the real-filesystem board walk
  would be slow and non-deterministic. The newline-title fixture covers the one real hazard directly.
- **Mutation → break map.**
  | mutation | reddens |
  |---|---|
  | delete the `/api/events` branch (fall through to 404) | task 1 (status 404, wrong content-type) |
  | delete `res.write(formatFrame(...))` | task 1 (bounded connect times out — never hangs) and task 2 |
  | `formatFrame` terminator `\n\n` → `\n` | task 2 (`nextFrame` never completes → bounded timeout) |
  | `formatFrame` drops `JSON.stringify` (`data: ${snapshot}`) | task 2 (`JSON.parse` fails / newline test) |
  | `content-type` → `application/json; charset=utf-8` | task 1 header assertion |
  | drop `cache-control` | task 1 header assertion |
  | add `res.end()` after the initial frame | task 2 (`rejects.toThrow(/stream ended/)` ≠ `/timed out/`) and task 4 (count drops early) |
  | move `const hub = ...` inside the request handler (per-request hub) | task 3 (`subscriberCount === 1`, not 2) |
  | delete `hub.subscribe(res)` | task 3 (`subscriberCount === 0`) |
  | delete `res.on('close', unsubscribe)` | task 4 (poll never reaches 1/0) |
  | `options.hub ?? createSnapshotHub()` → always `createSnapshotHub()` | tasks 3 and 4 (injected hub stays at 0) |
  | delete the events try/catch | task 5 (process-level throw / no 500) |
  | move `snapshot()` after `writeHead` | task 5 (ERR_HTTP_HEADERS_SENT instead of a clean 500) |
  | remove `server.closeAllConnections()` from `withServer` | the file's teardown hangs — every SSE test times out at file close |

## Spec references
- REQ-001 — never writes the target repo / never calls GitHub: `docs/spec.md:13-16`.
- REQ-006 — TypeScript package, "small Node HTTP server" half: `docs/spec.md:56-63`.
- REQ-008 — full snapshots pushed over SSE (rationale for no diffing/replay; the change clause
  itself is CARD-029/030): `docs/spec.md:71-77`.
- REQ-017 — `GET /api/events` SSE stream, "(and once on connect)" — this card's clause:
  `docs/spec.md:128-132`.
- REQ-019 — snapshot shape carried in the frame: `docs/spec.md:141-153`.
- REQ-034 — `EventSource` auto-reconnect re-syncs on the next snapshot (why no id/replay):
  `docs/spec.md:261-265`.
- Testing — integration spins the real server on a temp fixture board: `docs/spec.md:291-300`.
- ADR-0010 (`docs/adrs/0010-*`) — `createServer` factory, unlistened server, injectable snapshot,
  JSON error contract. ADR-0011 (`docs/adrs/0011-*`) — shared REQ-001 server guard.
- Card boundary: `docs/cards/CARD-007-sse-live-snapshots/slice.md:33-41,75-81` and
  `slice-check.md:40,45-49` (the `writeFixtureBoard`/`withServer` non-export finding).

## Open questions
None.

## Proposed ADRs

### SSE transport contract: full-snapshot `data:` frames broadcast by a per-server hub of frame sinks
**Context:** REQ-017 requires `GET /api/events` to stream the full snapshot on connect and on every
change. Four cards build on the shape chosen here — CARD-028 (watcher), CARD-029 (wires the watcher
into the hub), CARD-030 (debounce) and CARD-012 (the browser `EventSource` client). The wire format,
the hub's ownership model and whether the stream carries event names or ids are cross-card contracts
that are expensive to change once a producer and a consumer both depend on them. ADR-0010 already
fixed `createServer(options): Server` (unlistened) and an injectable `snapshot?: () => BoardSnapshot`;
this decision extends that server rather than replacing it.
**Decision:** Each connection is written as `data: ${JSON.stringify(snapshot)}\n\n` — the default SSE
message type: no `event:` name (the client uses `EventSource.onmessage`), no `id:` and no
Last-Event-ID replay, no per-client diffing or granular patch events. Response headers are exactly
`content-type: text/event-stream; charset=utf-8` and `cache-control: no-cache, no-transform`;
hop-by-hop `Connection` is left to Node and no `x-accel-buffering` is set (local-only deployment, no
proxy). Connections are held in a per-server `SnapshotHub`: `subscribe(sink: FrameSink): () => void`,
`publish(snapshot: BoardSnapshot): void` (serializes one frame, writes it to every sink),
`readonly subscriberCount: number`. `FrameSink` is the narrowest structural type —
`{ write(chunk: string): unknown }` — which `http.ServerResponse` satisfies, so the hub is
unit-testable with a plain object. The hub is injectable as `ServerOptions.hub`, defaulting to one
`createSnapshotHub()` per `createServer` call, so the CLI entry can hold a reference and publish into
it. On connect: `snapshot()` → `writeHead(200, SSE_HEADERS)` → write the initial frame →
`hub.subscribe(res)` → `res.on('close', unsubscribe)`. `snapshot()` runs before `writeHead` so a
throwing provider still yields ADR-0010's `500 {"error":"internal error"}` instead of an
ERR_HTTP_HEADERS_SENT crash.
**Consequences:** The client can never drift from disk (REQ-008's full-snapshot rationale) and
reconnect needs no replay machinery: the snapshot current at connect time is authoritative, which is
exactly what REQ-034's auto-reconnect relies on. CARD-029 needs only `hub.publish(snapshot)`;
CARD-030 only debounces upstream of it. `publish` therefore ships in CARD-027 with no caller and no
assertion — a deliberate, slice-sanctioned seam, not dead code; it is one ~4-line function and does
not endanger the 90% coverage target. Trade-off: adding an `event:` name or Last-Event-ID resume
later is a breaking change to both server and UI, accepted because full snapshots make resume
meaningless. `subscriberCount` is public API purely so connection lifecycle is observable in tests;
without it the unsubscribe line is a surviving mutant that becomes writes to dead sockets once
CARD-029 lands. Extends ADR-0010; supersedes nothing.
