# CARD-006 — Serve the parsed board over HTTP · implement

## What changed
- `test/server-guard.ts` (+ `test/server-guard.test.ts`, 17 tests): shared REQ-001 guard per ADR-0011 —
  `digestTree(dir)`, `assertNoRepoWrites(dir, body)`, `assertNoNonLoopbackNetwork(body)` (spies
  `net.Socket.prototype.connect`, handles its polymorphic + array-wrapped arg shapes, restores in
  `finally`, **fails closed** on an unrecognized connect-arg shape, also reads `.hostname`). Self-tested:
  detects a real write, a real non-loopback connect (raw `net.connect`, `fetch`, and a direct
  `socket.connect(port,host)`), allows a loopback one, restores the patch on success and throw.
- `src/server/http-server.ts` (+ `http-server.test.ts`, 6 tests): `createServer(options): http.Server`
  per ADR-0010 — unlistened factory, manual `(method, **pathname**)` dispatch. `GET /api/board` → 200
  `application/json; charset=utf-8`, `JSON.stringify(snapshot())` (default `buildSnapshot(options)`,
  injectable). Else → 404 `{"error":"not found"}`; throwing provider → 500 `{"error":"internal error"}`,
  no leak. Malformed-card fixture proves totality through the live endpoint, wrapped in the guard.
- `tsconfig.test.json`: added `src/server/http-server.ts` to `include`.
- `src/server/index.ts` rewrite: missing `argv[2]` → usage on stderr, exit 64. Else resolve
  `boardDir`/`projectName`, `createServer(...).listen(4400, '127.0.0.1', () => log url)`.

## Deviations from design
None functional. The `req.url ?? '/'` fallback (dropped in the fresh pass) is restored — the pathname fix
needs `new URL(req.url ?? '/', …)` for TS `string|undefined`; `http-server.ts` branch coverage 90.9% (line
20, the fallback, unreachable from a real request), still ≥ the 90% target.

## Rework (review panel fail → both blocking + 5 fold-ins)
1. **Blocking (functionality): pathname dispatch.** Was matching raw `req.url` → `GET /api/board?x=1`
   404'd. Added failing test (query → 200), then `const pathname = new URL(req.url ?? '/',
   'http://localhost').pathname` matched `=== '/api/board'`. Trailing-slash `/api/board/` stays 404 (exact).
2. **Blocking (tests): untested guard branch.** The `typeof first === 'number'` branch was a surviving
   mutant (both `net.connect`/`fetch` normalize to the array form first). Added a `new
   net.Socket().connect(80, '93.184.216.34')` direct-connect test. **Mutation-verified**: gutting the
   number branch reddens exactly the direct-connect + IPv6 direct tests; reverted, green.
3. **Fold-in: `fetch()`-block test** — `assertNoNonLoopbackNetwork(() => fetch('http://93.184.216.34/'))`
   rejects (the realistic GitHub-call threat, no real network).
4. **Fold-in: fail-closed + `.hostname`.** Refactored into `classifyConnectArgs` →
   `{kind:'allow'|'host'|'unrecognized'}`; an options object with none of host/hostname/path is
   `'unrecognized'` → **blocked** (was fail-open → silently allowed). Reads `.hostname` too. New tests red
   first, then green.
5. **Fold-in: IPv6 cases** — non-loopback `2001:4860:4860::8888` block + `::1` loopback-allow (direct connect).
6. **Fold-in: loopback bind** — `index.ts` `.listen(4400, '127.0.0.1', cb)` (was all-interfaces; log said
   localhost). Verified via `lsof -iTCP -sTCP:LISTEN` → `127.0.0.1:4400`.
7. **Fold-in: restore `now?` comment.** 8. **Fold-in: drop unused `ConnectArg.port`.**

No passing assertion weakened; module stays dependency-free (node:http/net/crypto + type-only card-model).

## Commits
- rework: `66a84f7` pathname dispatch · `a998a10` guard direct-connect branch + fail-closed · `fabe84d` bind 127.0.0.1
- fresh pass: `69cfe34`/`5cb2621`/`60cfff9`/`4f4bc13`/`1f9b61c`/`41a2d7f`

## Gates (real output, post-rework)
- `npm run lint` → ESLint: No issues found
- `npm run typecheck` (`tsc -b --noEmit`) → clean
- `npm run build` → vite (30 modules) + `tsc -b tsconfig.server.json --force` green
- `npm test` → Test Files 9 passed (9) / Tests 128 passed (128)
- `npx vitest run --coverage`: `http-server.ts` 100/90.9/100/100 (≥90%; line 20 unreachable fallback);
  `test/server-guard.ts` outside coverage `include` (per design) but its 17-test suite now reaches the
  previously-untested number-arg branch and is mutation-verified.
- Manual smoke: `lsof` shows `127.0.0.1:4400`; `curl /api/board` 200 with real data; bare invocation → exit 64.
