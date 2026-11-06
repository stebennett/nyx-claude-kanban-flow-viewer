---
id: ADR-0014
title: "SSE transport contract: full-snapshot data: frames broadcast by a per-server hub of frame sinks"
status: Accepted
date: 2026-07-21
card: CARD-027
supersedes: []
superseded_by: ""
---

# ADR-0014: SSE transport contract — full-snapshot frames via a per-server hub

## Context

REQ-017 requires `GET /api/events` to stream the full snapshot on connect and on every change. Four
cards build on the shape chosen here — CARD-028 (watcher), CARD-029 (wires the watcher into the hub),
CARD-030 (debounce) and CARD-012 (the browser `EventSource` client). The wire format, the hub's
ownership model, **when the snapshot is evaluated**, and whether the stream carries event names or ids
are cross-card contracts that are expensive to change once a producer and a consumer both depend on
them.

ADR-0010 already fixed `createServer(options): Server` (unlistened) and an injectable
`snapshot?: () => BoardSnapshot`; this decision extends that server rather than replacing it.

## Decision

Each connection is written as `data: ${JSON.stringify(snapshot)}\n\n` — the default SSE message type:
no `event:` name (the client uses `EventSource.onmessage`), no `id:` and no Last-Event-ID replay, no
per-client diffing or granular patch events. Response headers are exactly
`content-type: text/event-stream; charset=utf-8` and `cache-control: no-cache, no-transform`;
hop-by-hop `Connection` is left to Node and no `x-accel-buffering` is set (local-only deployment, no
proxy).

**The snapshot provider is invoked per connection, inside the request handler, at connect time — never
hoisted to `createServer` and never cached into a replayable frame**, so a client connecting mid-session
sees the board as of its own connect rather than as of server start.

Connections are held in a per-server `SnapshotHub`: `subscribe(sink: FrameSink): () => void`,
`publish(snapshot: BoardSnapshot): void` (serializes one frame, writes it to every sink with a `for…of`
loop, not a `forEach` callback), `readonly subscriberCount: number`. `FrameSink` is the narrowest
structural type — `{ write(chunk: string): unknown }` — which `http.ServerResponse` satisfies, so the hub
is unit-testable with a plain object. The hub is injectable as `ServerOptions.hub`, defaulting to one
`createSnapshotHub()` per `createServer` call, so the CLI entry can hold a reference and publish into it.

On connect: `snapshot()` → `writeHead(200, SSE_HEADERS)` → write the initial frame → `hub.subscribe(res)`
→ `res.on('close', unsubscribe)`. `snapshot()` runs **before** `writeHead`, inside a `try/catch` **scoped
to this branch**, so a throwing provider still yields ADR-0010's `500 {"error":"internal error"}` instead
of an ERR_HTTP_HEADERS_SENT crash.

## Consequences

The client can never drift from disk (REQ-008's full-snapshot rationale) and reconnect needs no replay
machinery: the snapshot current at connect time is authoritative, which is exactly what REQ-034's
auto-reconnect relies on — and that guarantee is only real because evaluation is per connection, which is
why it is stated as a decision here and pinned by a call-varying-provider test rather than left to the
implementer.

CARD-029 needs only `hub.publish(snapshot)`; CARD-030 only debounces upstream of it. `publish` therefore
ships in CARD-027 with no caller and no assertion — a deliberate, slice-sanctioned seam, not dead code;
it is one ~4-line function and does not endanger the 90% global coverage target.

**On the branch-scoped catch, stated precisely.** CARD-008 (in flight against the same handler) hoists
the per-route `try/catch` into one handler-wide catch. If that hoist also swallowed this branch, a throw
occurring *after* `writeHead(200, SSE_HEADERS)` would reach `sendJson(res, 500, …)` with headers already
sent — an ERR_HTTP_HEADERS_SENT crash. **That path is not covered by a test in CARD-027, and no test
here should be claimed to cover it:** the 500-contract test injects a provider that throws *before*
`writeHead`, so a widened catch still produces a clean 500 and the test stays green. Nothing in the SSE
branch throws synchronously after `writeHead`, so a test would be contrived. The defence is therefore
this clause plus the merge-order instruction in the design — whichever card lands second must keep the
events branch's own catch scoped to the pre-`writeHead` `snapshot()` call. What *is* test-covered is the
adjacent ordering mutation: moving `snapshot()` after `writeHead` reddens the 500 test.

Trade-off: adding an `event:` name or Last-Event-ID resume later is a breaking change to both server and
UI, accepted because full snapshots make resume meaningless. `subscriberCount` is public API purely so
connection lifecycle is observable in tests; without it the unsubscribe line is a surviving mutant that
becomes writes to dead sockets once CARD-029 lands.

Extends ADR-0010; supersedes nothing.

## Status

Accepted.
