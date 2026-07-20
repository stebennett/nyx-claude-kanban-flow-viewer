## CARD-006 — design: Serve the parsed board over HTTP   [feature · api]

### Why
The first user-reachable slice: `npx kanban-flow-viewer <repo>` starts a local HTTP server that serves the real parsed board snapshot over `GET /api/board`, and never writes to the target repo or calls GitHub. Builds directly on the shipped `buildSnapshot` (CARD-021/022) and the `BoardSnapshot` contract in `card-model.ts`.

### Design summary
- **`node:http`, no framework, no new runtime dep** (ADR-0002 zero-dep). `createServer(options): http.Server` is a **factory returning an unlistened server** so the caller owns the port (`index.ts` → 4400; tests → ephemeral `:0`).
- Manual `(method, pathname)` dispatch with a JSON `/api/*` contract: `GET /api/board` → 200 `application/json` `JSON.stringify(snapshot)`; anything else → 404 `{error:'not found'}`; a handler throw → 500 `{error:'internal error'}`.
- **Injectable `snapshot?: () => BoardSnapshot`** (default wires `buildSnapshot`) — the only way to reach the 500 branch since `buildSnapshot` is total (ADR-0008), and keeps fs I/O at the edge. Doubles as CARD-007's live-snapshot seam.
- `index.ts` rewritten as the CLI entry (resolve `boardDir`/`projectName` from `argv[2]`, `.listen(4400)`, log the URL).
- **REQ-001 (AC-2) proven suite-wide** by a shared, self-tested `test/server-guard.ts` (tree digest + loopback-only net-connect spy) that CARD-007/008/018 reuse — not a per-card assertion.
- 6 TDD tasks (tests-first). Size estimate ~320 lines (slice-check `SLC-SIZE`, range ~250–390; card `estimated_lines` 313) — well under the 500 cap.

### Acceptance criteria (sharpened)
- **AC-1 (REQ-010, REQ-016):** `GET /api/board` returns the current snapshot as 200 JSON equal to `buildSnapshot(...)`; port 4400 asserted by inspecting `.listen(4400)` (the 4400 default/auto-increment are CARD-018).
- **AC-2 (REQ-001):** never writes the target repo, never calls GitHub — enforced suite-wide.

### ADRs in this PR
- **ADR-0010** — First HTTP server: node:http with a createServer factory and a JSON /api/* contract.
- **ADR-0011** — REQ-001 enforced suite-wide by a shared server-guard, not per card.

### Open questions / decisions deferred
None.

Full design: `docs/cards/CARD-006-serve-board-over-http/design.md` (in this diff). Merging this PR approves the design and unblocks implementation — the implementation branch is cut from main after this merges, and the code arrives as a second PR.

🤖 Design delivered via /kanban
