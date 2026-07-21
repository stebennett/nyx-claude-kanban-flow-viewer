## CARD-006 — Serve the parsed board over HTTP (slice 1 of 2)   [feature · api]

_First slice of a 2-way carve (the reviewed branch was 679 lines, over the 500 cap). **This slice = the shared REQ-001 server-guard** (the dependency-free test tripwire). **Slice 2 (the HTTP server) follows** once this merges — it imports this guard. See `split.md`._

### Why
The **shared, self-tested REQ-001 tripwire** (ADR-0011) that every server-level test reuses to prove the viewer never writes the target repo or calls GitHub. Lands first because slice 2's server test — and CARD-007/008/018 — import it.

### What changed
- `test/server-guard.ts` (+161): `digestTree(dir)` (sorted board-relative paths + sha256), `assertNoRepoWrites(dir, body)` (tree digest equal before/after), `assertNoNonLoopbackNetwork(body)` (spies `net.Socket.prototype.connect`, **fails closed** on an unrecognized connect-arg shape, reads `.host`/`.hostname`/`.path`, handles the array-wrapped `net.connect`/`fetch` normalized form + the direct `socket.connect(port,host)` form, restores in `finally`). Imports only `node:*`.
- `test/server-guard.test.ts` (+226): **17 self-tests** — proves the guard catches a real repo write, a real non-loopback `net.connect`, a direct `socket.connect(port,host)`, a non-loopback `fetch()`, and an IPv6 non-loopback target; allows loopback (incl. `::1`); and restores the patch on both success and throw.

### Acceptance criteria
This is the **lead infrastructure slice** — it delivers no card AC by itself (AC-2 is fully proven once slice 2 wraps the live `/api/board` endpoint in this guard). Its job is to stand alone as the reusable guard.

### Testing
Slice-1 gates green standalone: lint, `tsc -b --noEmit`, build, `npm test` **122/122** (128 − the 6 http-server tests not yet present). `test/server-guard.ts` is outside coverage `include` per design, but its 17-test suite is mutation-verified (the number-arg connect branch reddens when gutted).

### Review
Full 8-lens panel on the whole branch (1 rework fixing a pathname-dispatch bug + hardening this guard). Per-slice `[acceptance]` re-run confirmed this slice is a faithful additive subset that stands alone (`split-acceptance.md`). ADR-0011 records the design.

### Knowledge
`[CARD-006]` net.connect arg shapes (direct vs array-wrapped), fail-closed guard classification, loopback bind — see `KNOWLEDGE.md`.

🤖 Card delivered via /kanban
