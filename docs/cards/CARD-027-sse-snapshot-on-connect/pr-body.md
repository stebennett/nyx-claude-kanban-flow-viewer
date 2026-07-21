## CARD-027 — design: SSE endpoint sends the current snapshot on connect   [feature · api]

### Why
This is the first of the four cards CARD-007 was split into, and it ships exactly half of REQ-017: the
"(and once on connect)" clause. `GET /api/events` opens a Server-Sent-Events stream, emits the current
board snapshot as one `data: <json>\n\n` frame, and **stays open**. The "on every change" clause is
CARD-029's. It also lands the `SnapshotHub` that CARD-028/029/030 and CARD-012's browser client all
build on.

### Design summary
- **Per-connection snapshot evaluation is a decision, not an implementation detail.** `snapshot()` is
  called inside the request handler for each connection — never hoisted to `createServer`, never cached
  into a replayable frame. A client connecting mid-session must see the board as of *its own* connect;
  REQ-034's auto-reconnect guarantee silently depends on it.
- **The main design risk is a hung test file, not the endpoint.** `server.close()` never fires its
  callback while an SSE response is in flight, so `withServer` gains `closeAllConnections()` before
  awaiting close. And because vitest *abandons* a timed-out test's promise chain — so a `finally` never
  runs — every open connection and server is also swept by `afterEach`. Every wait is individually
  bounded, and because per-wait budgets don't compose, every multi-wait test carries an explicit
  `{ timeout: 10_000 }`.
- **Two distinguishable rejection messages make "stays open" a real assertion.** `nextFrame` rejects with
  either `SSE read timed out` or `SSE stream ended`, so `rejects.toThrow(/timed out/)` passes *only* if
  there was no EOF — a `res.end()` would flip it to the other message, which task 6 verifies by running
  that mutation for real.
- **`hub.publish` ships with no caller and no assertion** — CARD-029's seam, sanctioned at slice time,
  and called out explicitly so a coverage or review check doesn't read it as dead code (one uncovered
  function against a global 90% threshold).

### Acceptance criteria (sharpened)
- **AC-1 (REQ-017, `spec.md:128-132`)** — 200, `text/event-stream; charset=utf-8`,
  `cache-control: no-cache, no-transform`, and exactly one `data: <json>\n\n` frame deep-equal to
  `buildSnapshot(options)`, cross-checked against fixture-derived values that never pass through the
  server.
- **AC-2(a)** — the response is not ended after the initial frame (timeout error, not stream-ended).
- **AC-2(b)** — a second connection receives a snapshot **evaluated at its own connect time**, asserted
  with a call-varying provider: A's frame carries `p1`, B's carries `p2`, provider called exactly twice.
- **AC-3** — a client disconnect unsubscribes it (`subscriberCount` 2 → 1 → 0).
- **AC-4 (ADR-0010)** — a throwing provider yields `500 {"error":"internal error"}` with no message leak
  and no half-written SSE response.

### ADRs in this PR
- **ADR-0014 — SSE transport contract: full-snapshot `data:` frames broadcast by a per-server hub of
  frame sinks.** Extends ADR-0010; supersedes nothing.

### Open questions / decisions deferred
The designer raised none. Four things worth a reviewer's attention:

1. **This card was reworked once, on a finding worth understanding.** The original AC-2(b) test asserted
   both connections' frames deep-equal `buildSnapshot(options)` — which **cannot detect the bug it
   exists to catch**. With `now` pinned for determinism the two frames are byte-identical, so an
   implementation that evaluates `snapshot()` once at `createServer` and replays a cached frame passed
   every test. Worse, it would have survived CARD-029 too, whose AC only covers broadcast to
   *already-connected* clients — shipping as a stale board for anyone connecting mid-session. The fix
   splits the test: 3a keeps the deep-equal for **shape**, 3b uses a call-varying provider for
   **freshness**. Task 6 runs the cached-frame mutation for real to confirm 3b reddens while 3a stays
   green — that asymmetry is the evidence, not merely that a test was added.
2. **A cross-card hazard that is deliberately *not* test-covered.** CARD-008 (PR #62) hoists the
   per-route `try/catch` into one handler-wide catch. If that swallowed this branch, a throw *after*
   `writeHead` would call `sendJson` with headers already sent — the exact ERR_HTTP_HEADERS_SENT crash
   this design prevents. The 500-contract test does **not** guard it (its provider throws *before*
   `writeHead`, so a widened catch still yields a clean 500 and the test stays green), and ADR-0014 says
   so plainly rather than claiming cover it doesn't have. The defence is the ADR clause plus the
   merge-order instruction: whichever card lands second keeps the events branch's own catch scoped to
   the pre-`writeHead` call.
3. **Size.** Re-derived at ~276 by the designer; the design check re-derived ~328 using this file's own
   demonstrated 24.3 lines-per-test rate, against `estimated_lines: 195`. No breach of the 500 cap
   either way, but the pre-authorised cut list should be sized off the higher figure.
4. **One assumption is probed, not asserted.** Whether `server.requestTimeout` bounds request *receipt*
   rather than response duration could not be settled at design time. Task 6 confirms it empirically now
   that a stream exists and records the result; if it's false that's a KNOWLEDGE entry and a flag for
   CARD-029/CARD-012, not a change to this card.

The design check verdicted **pass** on all eight `DSG-*` criteria. Five advisories ride this PR — see
`docs/cards/CARD-027-sse-snapshot-on-connect/design-check.md`; advisory 4 (two under-specified steps: the
`afterEach` sweep predicate and how the `requestTimeout` probe gets at the server) should be resolved at
implement time. The advisory about the ADR overstating its own test cover was applied to ADR-0014's text
at persistence time, since an ADR lands permanently on `main`.

Full design: `docs/cards/CARD-027-sse-snapshot-on-connect/design.md` (in this diff). Merging this PR
approves the design and unblocks implementation — the implementation branch is cut from main after this
merges, and the code arrives as a second PR.

🤖 Design delivered via /kanban
