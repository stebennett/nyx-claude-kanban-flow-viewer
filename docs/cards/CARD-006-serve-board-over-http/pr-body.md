## CARD-006 — Serve the parsed board over HTTP (slice 2 of 2)   [feature · api]

_Final slice of a 2-way carve (the reviewed branch was 679 lines, over the 500 cap). **Slice 1 (the shared REQ-001 server-guard, PR #58) is already on `main`** — this slice's tests import it. This slice = **the HTTP server and CLI wiring**, and it carries both of the card's acceptance criteria. See `split.md`._

### Why
The first user-reachable slice of the product: `npx kanban-flow-viewer <repo>` starts a server and serves the real parsed board over HTTP. A `node:http` `createServer` factory (ADR-0010) exposes `GET /api/board` returning the snapshot `buildSnapshot` already assembles (CARD-021/022), and the CLI entry point wires it up.

### What changed
- `src/server/http-server.ts` (+45): `createServer(options): http.Server` per ADR-0010 — an **unlistened factory** (the caller owns the port, so tests bind `:0`), manual `(method, pathname)` dispatch. `GET /api/board` → 200 `application/json; charset=utf-8` with `JSON.stringify(snapshot())` (defaults to `buildSnapshot(options)`, injectable for tests). Anything else → 404 `{"error":"not found"}`; a throwing snapshot provider → 500 `{"error":"internal error"}` with no internal detail leaked. Dispatch matches `new URL(req.url ?? '/', …).pathname`, so `/api/board?x=1` serves and `/api/board/` stays a 404 (exact match).
- `src/server/http-server.test.ts` (+218, 6 tests): the endpoint served over a real socket on an **ephemeral port** — 200 + correct content-type + snapshot body, `?query` still 200, unknown path 404, `POST` 404, throwing provider 500-without-leak, and a **malformed-card fixture** proving snapshot totality through the live endpoint. That last test — the one that runs the server against a real on-disk board directory — is wrapped in `assertNoRepoWrites` + `assertNoNonLoopbackNetwork` from slice 1's guard; the other five drive an injected snapshot provider and are not guard-wrapped.
- `src/server/index.ts` (+20/-8): CLI entry — missing `argv[2]` → usage on stderr and **exit 64**; otherwise resolve `boardDir`/`projectName` and `createServer(...).listen(4400, '127.0.0.1', …)` (loopback-only bind).
- `tsconfig.test.json` (+1): `src/server/http-server.ts` added to `include`.

### Acceptance criteria
- [x] `npx kanban-flow-viewer <path-to-repo>` starts a server on port 4400 and `GET /api/board` returns the snapshot (REQ-010, REQ-016) — the endpoint is proven over a real socket on an ephemeral port (per the card's design note, the *default* of 4400 and its auto-increment belong to CARD-018); `index.ts` binds 4400 on `127.0.0.1`, smoke-verified with `lsof` + `curl`.
- [x] Running the viewer never writes to the target repository and makes no network call to GitHub (REQ-001) — proven by the malformed-card test, the one test that serves a **real on-disk board directory** through the live endpoint: its body is wrapped in slice 1's `assertNoRepoWrites` (tree digest equal before/after) and `assertNoNonLoopbackNetwork` (fails closed on an unrecognized connect-arg shape). The other five tests inject a snapshot provider and never touch the target repo, so they are not guard-wrapped. Siting the guard across *every* server-level test — the card's design note — becomes worthwhile once CARD-007's watcher and CARD-008's doc reads add code that actually touches the target tree; this card's guard is the shared, self-tested helper that makes that cheap.

### Testing
Full-branch gates green: lint, `tsc -b --noEmit`, build, `npm test` **128/128** across 9 files. Coverage overall 100% stmts / 97.95% branch / 100% funcs / 100% lines; `http-server.ts` **100/90.9/100/100**, at or above the 90% target (the one uncovered branch is the `req.url ?? '/'` TypeScript-safety fallback, unreachable from a real request).

### Review
Full 8-lens panel on the whole branch, with **one rework** that fixed two blocking findings — a pathname-dispatch bug (raw `req.url` made `/api/board?x=1` 404) and an untested, fail-open branch in the guard — plus six hardening fold-ins (fail-closed classification, `fetch()`-block and IPv6 cases, loopback bind). Both fixes are mutation-verified. The per-slice `[acceptance]` re-run confirmed this slice delivers both ACs and that its guard import resolves against slice 1 on `main` (`split-acceptance.md`). ADR-0010 records the `node:http` decision.

### Knowledge
`[CARD-006]` unlistened-factory testability, pathname-vs-`req.url` dispatch, snapshot-provider injection — see `KNOWLEDGE.md`.

🤖 Card delivered via /kanban
