## Verdict
Right-sized. `right_sized: true`, `gate: none`.

## Rationale
CARD-006 is the smallest slice that is independently shippable and testable: start a server, serve the
real parsed board over it, and prove it never touches the target repo or the network while doing so.

- **AC-1** (server + `GET /api/board`) and **AC-2** (no-write/no-network) are not two features — AC-2 is
  a guard invariant on AC-1's behavior. Splitting them would either ship an unguarded HTTP server first
  (a real regression risk the card's own design note calls out as "cheap now, unbuyable later") or
  produce an AC-2-only child with no observable functionality of its own — the "never create a
  setup/scaffolding child" heuristic rules that out directly.
- The card is already the product of one split at intake (528 → this + CARD-018's CLI flags/validation).
  Checking the four dependents (CARD-007 SSE/watcher, CARD-008 phase docs, CARD-009 `GET /`, CARD-018
  flags/validation) confirms none of their ACs overlap this card's `GET /api/board` — the boundary drawn
  at intake holds.
- Port binding and CLI flags are correctly deferred to CARD-018 per the card's own design note: this
  card's test binds an ephemeral port and asserts the served snapshot; the *default* of 4400 is asserted
  by inspection/build only, not a live-network test.

A further split (e.g. "server module" vs "wire it into the CLI entry") would be a horizontal/layer split
with no independent shippable behavior on either side — explicitly disallowed.

## Size estimate
Building on existing `buildSnapshot`/`card-model.ts` (CARD-021/CARD-022, on main), the new work is a
thin HTTP wrapper + CLI wiring + the suite-wide guard this card is the first to need.

| File | Change | Est. lines |
|---|---|---|
| `src/server/http-server.ts` (new) | `createServer(options)`: `node:http` server, `GET /api/board` → `buildSnapshot` → JSON 200, non-matching route → 404, thrown-error path → 500 | ~55 |
| `src/server/http-server.test.ts` (new) | Fixture board on disk + ephemeral (`:0`) port; asserts `GET /api/board` shape/content, unknown route 404, non-GET method, malformed-card board still 200s with `parseErrors`; applies the shared no-write/no-network guard | ~150 |
| `test/server-guard.ts` (new) | Shared suite-wide REQ-001 guard per the card's design note (hash the fixture tree before/after; assert no request escapes to a non-loopback host) — reused by CARD-007/008/018 | ~55 |
| `src/server/index.ts` (rewrite) | Replace the CARD-005 placeholder: read `process.argv[2]` as the repo path, resolve `boardDir`/`projectName`, `createServer(...).listen(4400)`, log the URL. No flag parsing (CARD-018) | ~46 changed |
| `tsconfig.test.json` | Add `src/server/http-server.ts` to `include` | ~1 |

**Total ≈ 320 changed lines** (64% of the 500 cap) — inside `size_limit`, consistent with the card's own
313 estimate. `index.ts` stays excluded from the coverage threshold (KNOWLEDGE [CARD-001]: entry points
proven by build/smoke, not unit coverage).
