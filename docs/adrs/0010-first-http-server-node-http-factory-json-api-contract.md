---
id: ADR-0010
title: "First HTTP server: node:http with a createServer factory and a JSON /api/* contract"
status: Accepted
date: 2026-07-20
card: CARD-006
supersedes: []
superseded_by: ""
---

# ADR-0010: First HTTP server: node:http with a createServer factory and a JSON /api/* contract

## Context

REQ-006 specifies a "small Node HTTP server"; REQ-016 requires `GET /api/board`. The zero-runtime-dep
doctrine (ADR-0002, amended only for gray-matter by ADR-0005) discourages a web framework. CARD-007
(SSE), CARD-008 (phase docs) and CARD-009 (SPA) all extend this same server, so it needs a testable seam
and a consistent error contract. `buildSnapshot` is a total function (ADR-0008), so a 500 branch is
unreachable unless a seam exists to inject a failure.

## Decision

Use `node:http` with manual routing — no web framework, no new runtime dependency. Expose
`createServer(options): http.Server` as a factory returning an **unlistened** server so callers pick the
port (`index.ts` binds 4400; tests bind `:0`). Dispatch on `(method, pathname)`: exactly
`GET /api/board` → `200 application/json` `JSON.stringify(snapshot)`; everything else → `404`
`{"error":"not found"}`; any handler throw → `500` `{"error":"internal error"}`. The snapshot source is
an injectable `snapshot?: () => BoardSnapshot` (default `() => buildSnapshot({boardDir, projectName,
now})`) so the error path is testable without mocking fs and I/O stays at the edge.

## Status

Accepted

## Consequences

No framework to audit; runtime deps stay `{gray-matter}`. Manual routing is trivial at this route count;
CARD-007/008/009 add branches to the same dispatch and reuse the JSON error contract + factory. The
injectable snapshot doubles as CARD-007's live-snapshot seam. Trade-off: manual routing gives no
automatic method/param handling and returns 404 (not 405) for a wrong method on a known path — accepted
for a read-only local server. Reversing to a framework later means rewriting the dispatch in every
server card, hence the ADR.
