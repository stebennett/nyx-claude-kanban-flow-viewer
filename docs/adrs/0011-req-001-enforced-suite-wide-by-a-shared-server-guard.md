---
id: ADR-0011
title: "REQ-001 enforced suite-wide by a shared server-guard, not per card"
status: Accepted
date: 2026-07-20
card: CARD-006
supersedes: []
superseded_by: ""
---

# ADR-0011: REQ-001 enforced suite-wide by a shared server-guard, not per card

## Context

REQ-001 (never writes the target repo, never calls GitHub) is a cross-cutting negative invariant on
every server-level behavior. CARD-006's server, CARD-007's chokidar watcher (which can be configured to
write), CARD-008's doc reads and CARD-018's validation all touch the target repo. Asserting the
invariant only in CARD-006 leaves later cards unguarded — "cheap now, unbuyable later" (the card's own
design note).

## Decision

Ship a shared `test/server-guard.ts`: `digestTree(dir)` (sorted board-relative paths each with a sha256
of contents), `assertNoRepoWrites(dir, body)` (digest equal before/after `body`),
`assertNoNonLoopbackNetwork(body)` (spy `net.Socket.prototype.connect` for `body`'s duration; only
loopback targets allowed, non-loopback throws). Every server-level test wraps its exercise in these. The
guard is itself unit-tested — it must detect a real write and a real non-loopback connect — so it cannot
pass vacuously.

## Status

Accepted

## Consequences

One reusable tripwire enforces REQ-001 across CARD-006/007/008/018 with no bespoke per-card assertion.
The network guard asserts on the connection TARGET (loopback vs not), so it catches a GitHub call by its
remote address without real DNS or network in tests. `net.Socket.prototype.connect`'s first arg is
polymorphic (port number / IPC path string / `{host,port,path}` object) — the guard reads the host
accordingly and treats `undefined`/`''`/`localhost`/`127.0.0.1`/`::1`/`::ffff:127.0.0.1` as loopback;
undici (global `fetch`) connects via net sockets, so the spy catches `fetch` too. Future server-level
tests MUST adopt the guard; a card that skips it silently re-opens the gap — hence recording the pattern
as an ADR the later cards inherit.
