# CARD-006 — Serve the parsed board over HTTP · design

## Intent
The first user-reachable slice: `npx kanban-flow-viewer <repo>` starts a local HTTP server that serves
the real parsed board snapshot over `GET /api/board`, and it never writes to the target repo or calls
GitHub. Builds directly on the shipped `buildSnapshot` (CARD-021/022) and the `BoardSnapshot` contract
in `card-model.ts`.

## Acceptance criteria
- **AC-1 (REQ-010, REQ-016):** starting the server and issuing `GET /api/board` returns the current
  snapshot as `200 application/json`, whose parsed body equals `buildSnapshot({boardDir, projectName,
  now})` for that board. Observable: `createServer` on an ephemeral `:0` port against a fixture board;
  `fetch('/api/board')` → status 200, `Content-Type: application/json; charset=utf-8`, body deep-equals
  the direct buildSnapshot output and carries the fixture's `projectName`, card ids and
  `config.wipLimit`. Port **4400** is asserted by inspecting `index.ts`'s `.listen(4400)` — not a live
  4400 test (card design note; the 4400 default + auto-increment are CARD-018).
- **AC-2 (REQ-001):** running the viewer never writes to the target repo and makes no network call to
  GitHub. Observable **suite-wide**: every server-level test wraps its exercise in
  `assertNoRepoWrites(boardDir, …)` (board tree digest identical before/after) and
  `assertNoNonLoopbackNetwork(…)` (no outbound connection to a non-loopback host).

## In scope
- `src/server/http-server.ts`: `createServer(options)` node:http factory + `GET /api/board` routing and
  the 404/500 JSON error contract.
- `src/server/index.ts` rewrite: CLI entry — resolve `boardDir`/`projectName` from `process.argv[2]`,
  `createServer(...).listen(4400)`, log the URL.
- `test/server-guard.ts`: shared suite-wide REQ-001 guard (+ its own unit test).
- `tsconfig.test.json`: add `src/server/http-server.ts` to `include`.

## Out of scope
- CLI flag parsing (`--port`/`--board-dir`/`--no-open`), the 4400 default value semantics, port
  auto-increment, and startup validation → **CARD-018**.
- SSE `GET /api/events` and the chokidar watcher → **CARD-007**.
- `GET /api/cards/:id/docs` phase-doc serving → **CARD-008**.
- `GET /` serving the built SPA → **CARD-009**. (For M2 the default route is a 404.)

## Dependencies & assumptions
- `buildSnapshot({boardDir, projectName, now?}): BoardSnapshot` exists on main
  (`src/server/build-snapshot.ts`) and is **total** — never throws, degrades to `parseErrors`
  (ADR-0008). The server never needs to catch it for board data.
- `BoardSnapshot` and its members are the dependency-free contract in `card-model.ts` ([CARD-021]); the
  server imports the type only.
- `index.ts` is a coverage-excluded entry point proven by build/smoke ([CARD-001]).
- Node 20+, ESM (ADR-0001); global `fetch`/`node:http`/`node:net` available.

## Approach
A `node:http` server with manual `(method, pathname)` routing (no framework, no new runtime dep).
`createServer(options): http.Server` returns an **unlistened** server so the caller owns the port
(`index.ts` → 4400; tests → `:0`). The request handler serializes an injectable `snapshot?: () =>
BoardSnapshot` (default `() => buildSnapshot(...)`):

- `GET /api/board` → `200 application/json; charset=utf-8`, `JSON.stringify(snapshot())`.
- any other `(method, pathname)` → `404` `{"error":"not found"}`.
- snapshot serialization throws → `500` `{"error":"internal error"}`.

REQ-001 (AC-2) is proven by a **shared** `test/server-guard.ts` reused by CARD-007/008/018, not by a
one-off assertion — see Proposed ADRs.

**Alternatives considered.** (a) *Express/Fastify* — rejected: adds a runtime dep against the zero-dep
doctrine (ADR-0002) for three routes of manual dispatch. (b) *No 500 branch, lean on buildSnapshot
totality* — rejected: the slice enumerates the thrown-error path, and CARD-008 will add fs reads inside
handlers that CAN throw, so a defensive per-request catch + a test seam is prudent now. (c) *Per-card
REQ-001 assertion* — rejected: the guard is cross-cutting (watcher, doc reads, validation all touch the
repo); a shared, self-tested helper is the design note's "cheap now, unbuyable later" resolution.

## Interfaces
```ts
// src/server/http-server.ts
import { type Server } from 'node:http';
import type { BoardSnapshot } from './card-model.js';

export interface ServerOptions {
  boardDir: string;
  projectName: string;
  now?: () => Date;                 // passthrough to buildSnapshot (deterministic tests)
  snapshot?: () => BoardSnapshot;   // injectable source; default wires buildSnapshot
}
export function createServer(options: ServerOptions): Server;

// test/server-guard.ts
export function digestTree(dir: string): string;
export async function assertNoRepoWrites<T>(dir: string, body: () => Promise<T> | T): Promise<T>;
export async function assertNoNonLoopbackNetwork<T>(body: () => Promise<T> | T): Promise<T>;
```
`index.ts` exports nothing; it resolves `boardDir = resolve(argv[2], 'docs/cards')`, `projectName =
basename(resolve(argv[2]))`, `createServer({boardDir, projectName}).listen(4400)`.

## Data flow
`GET /api/board` → handler calls `snapshot()` → default `buildSnapshot({boardDir, projectName, now})`
reads `board_dir` from disk, returns a `BoardSnapshot` (parse failures already inside `parseErrors`) →
`JSON.stringify` → `200`. No schema/migration impact (read-only). No writes, no outbound sockets
anywhere in the path.

## Implementation task list
1. **Shared REQ-001 guard.** Create `test/server-guard.test.ts` (failing) then `test/server-guard.ts`.
   Tests: `digestTree changes when a file is added/modified/removed` (three assertions over a temp dir),
   `assertNoRepoWrites throws when body writes a file` (`await expect(...).rejects`), `assertNoRepoWrites
   returns body's value when the tree is untouched`, `assertNoNonLoopbackNetwork throws when body
   connects to a non-loopback host` (body does `net.connect(80,'93.184.216.34')` wrapped, expect reject;
   no real completion needed — the spy throws synchronously at connect), `assertNoNonLoopbackNetwork
   allows a loopback connect` (body fetches a `:0` echo server on 127.0.0.1). Implement: `digestTree`
   walks `dir`, sorts board-relative paths, hashes contents (`node:crypto` sha256), joins; the two
   asserters wrap `body` with try/finally, restoring the patched `net.Socket.prototype.connect`.
   Red→green→commit.
2. **`GET /api/board` happy path + tsconfig.** Add `src/server/http-server.ts` to `tsconfig.test.json`
   `include`. Create `src/server/http-server.test.ts` (failing) with a `withServer(options, cb)` helper
   (`listen(0)`, derive base URL from `address().port`, `close()` in finally) and a fixture-board writer.
   Test `GET /api/board returns 200 with the buildSnapshot payload`: fixture board (config.md + two valid
   CARD dirs), `createServer({boardDir, projectName:'fixture-project', now:()=>FIXED})` **without**
   injecting `snapshot`; assert `res.status===200`, `content-type==='application/json; charset=utf-8'`,
   parsed body `.toEqual(buildSnapshot({boardDir, projectName:'fixture-project', now:()=>FIXED}))`, and
   independently `body.projectName==='fixture-project'`, `body.cards.map(c=>c.id)` contains both fixture
   ids, `body.config.wipLimit===2`. Implement `createServer` (default provider branch). Red→green→commit.
3. **404 route + method contract.** Tests `GET /unknown returns 404 {error:'not found'}` and `POST
   /api/board returns 404` (both: status 404, `content-type` application/json, parsed `{error:'not
   found'}`). Extend the handler's else branch. Red→green→commit.
4. **500 error contract.** Test `a throwing snapshot provider yields 500 {error:'internal error'}`:
   `createServer({boardDir, projectName, snapshot:()=>{throw new Error('boom')}})`, `GET /api/board` →
   status 500, parsed `{error:'internal error'}`, and body does **not** contain `'boom'` (no leak). Add
   the try/catch. Red→green→commit.
5. **Totality through the endpoint + REQ-001 guard wrap.** Test `a board with a malformed card still
   returns 200 with parseErrors`: fixture with one valid card + one `CARD-XXX/card.md` of malformed YAML;
   `GET /api/board` → 200, `body.cards` has the valid id, `body.parseErrors` has an entry with
   `path==='CARD-XXX/card.md'` and `not.toContain(boardDir)` ([CARD-021]). Wrap this request in
   `assertNoRepoWrites(boardDir, …)` and `assertNoNonLoopbackNetwork(…)` — proves AC-2 for the live
   endpoint. Red→green→commit.
6. **CLI entry rewrite.** Rewrite `src/server/index.ts`: drop the placeholder + `uiDistDir` import (now
   covered by `paths.test.ts`); guard missing `argv[2]` (stderr usage, exit 64); else resolve
   `boardDir`/`projectName`, `createServer(...).listen(4400, () => log url)`. Verify with `npm run
   build:server` + `tsc -b --noEmit`; record a manual smoke (`node dist/server/index.js <fixture>` then
   `curl /api/board`) — no automated live-4400 test (card note). Commit.

## Test strategy
- **Gates:** `eslint .`, `tsc -b --noEmit` ([CARD-001]: never plain `tsc --noEmit`), `npm run build`,
  `vitest run` all green. `http-server.ts` meets the 90% coverage_target; `index.ts` and `test/**` are
  coverage-excluded.
- **Branch coverage of `http-server.ts`:** happy 200 (task 2, default provider), 404 unknown path + 404
  non-GET (task 3), 500 (task 4, injected provider). The default-vs-injected `??` is covered because
  task 2 omits `snapshot` and task 4 supplies it.
- **Independent expected values:** the 200 body is deep-equaled against a *direct* `buildSnapshot` call
  AND cross-checked against fixture-derived constants (`projectName`, card ids, `wipLimit===2`) computed
  without the server, so a hardcoded/empty payload fails.
- **Design-named contract details asserted:** status codes 200/404/500, exact `Content-Type:
  application/json; charset=utf-8`, the `{error:'not found'}` / `{error:'internal error'}` bodies, no
  error-message leak on 500, and `parseErrors[].path` board-relative (`not.toContain(boardDir)`).
- **Guard self-tests** (task 1) make the REQ-001 assertion non-vacuous.
- **Mutation → break map:** flip the route string → task-2 200 goes 404; 200→other → task 2 fails;
  return `{}` → deep-equal + field asserts fail; drop the 404 else → task-3 fails; delete the 500
  try/catch → task-4 no 500; a handler that writes → task-5 `assertNoRepoWrites` rejects; `digestTree`
  constant → task-1 add/modify/remove fail; change `.listen(4400)` → inspection/smoke fails.
- No property test earns its keep (finite dispatch, no numeric invariant). Determinism: fixed `now`,
  ephemeral `:0` port, loopback-only, servers closed in `finally`.

## Spec references
- REQ-001 — never writes / never calls GitHub: `docs/spec.md:13-16`.
- REQ-006 — "small Node HTTP server" (structural, by residence): `docs/spec.md:56-63`.
- REQ-010 — `npx kanban-flow-viewer <path-to-repo>`: `docs/spec.md:87-92`.
- REQ-016 — `GET /api/board` returns the current snapshot (JSON): `docs/spec.md:123-126`.
- REQ-019 — snapshot shape (the JSON contract served): `docs/spec.md:141-153`.
- Testing — integration spins the real server on a temp fixture and asserts `/api/board`:
  `docs/spec.md:291-300`.
- ADR-0008 — buildSnapshot is total: `docs/adrs/0008-*`.

## Proposed ADRs

### First HTTP server: node:http with a createServer factory and a JSON /api/* contract
**Context:** REQ-006 specifies a "small Node HTTP server"; REQ-016 requires `GET /api/board`. The
zero-runtime-dep doctrine (ADR-0002, amended only for gray-matter by ADR-0005) discourages a web
framework. CARD-007 (SSE), CARD-008 (phase docs) and CARD-009 (SPA) all extend this same server, so it
needs a testable seam and a consistent error contract. buildSnapshot is total (ADR-0008), so a 500
branch is unreachable unless a seam exists to inject a failure.
**Decision:** Use node:http with manual routing — no web framework, no new runtime dependency. Expose
`createServer(options): http.Server` as a factory returning an **unlistened** server so callers pick the
port (index.ts → 4400; tests → `:0`). Dispatch on `(method, pathname)`: exactly `GET /api/board` → 200
`application/json` `JSON.stringify(snapshot)`; everything else → 404 `{error:'not found'}`; any handler
throw → 500 `{error:'internal error'}`. The snapshot source is an injectable `snapshot?: () =>
BoardSnapshot` (default `() => buildSnapshot({boardDir, projectName, now})`) so the error path is
testable without mocking fs and I/O stays at the edge.
**Consequences:** No framework to audit; runtime deps stay `{gray-matter}`. Manual routing is trivial at
this route count; CARD-007/008/009 add branches to the same dispatch and reuse the JSON error contract +
factory. The injectable snapshot doubles as CARD-007's live-snapshot seam. Trade-off: manual routing
returns 404 (not 405) for a wrong method on a known path — accepted for a read-only local server.

### REQ-001 enforced suite-wide by a shared server-guard, not per card
**Context:** REQ-001 (never writes the target repo, never calls GitHub) is a cross-cutting negative
invariant on every server-level behavior. CARD-006's server, CARD-007's chokidar watcher (which can be
configured to write), CARD-008's doc reads and CARD-018's validation all touch the target repo.
Asserting it only in CARD-006 leaves later cards unguarded — "cheap now, unbuyable later" (card design
note).
**Decision:** Ship a shared `test/server-guard.ts`: `digestTree(dir)` (sorted board-relative paths each
with a sha256 of contents), `assertNoRepoWrites(dir, body)` (digest equal before/after body),
`assertNoNonLoopbackNetwork(body)` (spy `net.Socket.prototype.connect` for body's duration; only
loopback targets allowed, non-loopback throws). Every server-level test wraps its exercise in these. The
guard is itself unit-tested — it must detect a real write and a real non-loopback connect — so it cannot
pass vacuously.
**Consequences:** One reusable tripwire enforces REQ-001 across CARD-006/007/008/018 with no bespoke
per-card assertion. The network guard asserts on the connection TARGET (loopback vs not), so it catches
a GitHub call by its remote address without real DNS or network in tests. Future server-level tests MUST
adopt it; a card that skips it silently re-opens the gap.
