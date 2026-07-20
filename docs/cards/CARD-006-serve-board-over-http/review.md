---
verdict: pass
review_lenses_failed: []
---
# CARD-006 — Review panel (full, 8 lenses)

Verdict: **pass** — complete and clean. All 8 lenses pass (advisories only). The `functionality` and
`tests` lenses (which found the two blocking defects on the first pass) re-ran against the reworked branch
and both confirmed the fixes; the tests lens independently mutation-verified each one.

## [acceptance]
### Blocking
None.
### Advisory
- Both ACs trace to falsifiable tests. `assertNoRepoWrites` digests only the passed dir — note for CARD-007/008 reuse (pass the repo root).

## [design]
### Blocking
None.
### Advisory
None (the pre-rework raw-`req.url` dispatch was fixed to pathname). Faithful: node:http factory, no new dep, unlistened server, injectable snapshot seam, type-only `BoardSnapshot`, shared guard reusable by CARD-007/008/018.

## [functionality]
### Blocking
None. Prior pathname-dispatch blocker resolved.
### Advisory
- `test/server-guard.ts:116` — an IPC unix socket via `net.connect({path})` classifies as host → **blocked**, while the string form `net.connect('/tmp/x.sock')` is allowed — an options-vs-string inconsistency. Fails *closed* (safe for a REQ-001 tripwire), latent (no server-level test uses options-form IPC). Fix if touched.
- `http-server.ts:20` — `new URL(...)` is outside the try/catch; not reachable (Node guarantees a valid request-target), noted only.
### Verified
Pathname fix correct+complete (`?query`→200, trailing-slash→404 exact-route); guard hardening sound (fail-closed `classifyConnectArgs`, reads `.hostname`, `::1`/`::ffff:127.0.0.1` loopback); loopback bind correct; 500 path orders `JSON.stringify` before `writeHead` (no partial write).

## [security]
### Blocking
None.
### Advisory
- (Pre-rework) all-interfaces bind → **fixed** (`.listen(4400,'127.0.0.1')`). (Pre-rework) fail-open guard + no fetch-block test → **fixed** (fail-closed on unrecognized shapes, `.hostname`, fetch-block test).

## [simplicity]
### Blocking
None.
### Advisory
- (Pre-rework) unused `ConnectArg.port` → **dropped**. Routing/index minimal; connect-arg classify decomposed sensibly; diff scope matches design.

## [tests]
### Blocking
None.
### Advisory
None.
Independently mutation-verified: reverting the pathname fix reddens exactly the `?query` test; gutting the guard's number-branch reddens exactly the 2 direct-connect(number,host) tests; flipping `unrecognized`→allowed reddens the fail-closed test; the `fetch()`-block test rejects in 5ms (synchronous connect-time throw) vs ~4s for an unguarded fetch — non-vacuous. 128/128 green; no `.only`/`.skip`/weakened assertions.

## [readability]
### Blocking
None.
### Advisory
- (Pre-rework) missing `now?` comment → **restored**. Naming, the `unwrapConnectArgs`/`classifyConnectArgs` why-comments, and consistency with `build-snapshot.ts`/`paths.ts` all clean.

## [typescript]
### Blocking
None.
### Advisory
- `http-server.test.ts` — an unguarded `server.address() as AddressInfo` cast; inline ad-hoc response shapes vs `Pick<BoardSnapshot,…>`. Low-risk test-quality nits.
Clean: `import type` discipline (no runtime dep), zero `any`/`!`/double-casts, the connect-patch casts minimal + localized + doc-commented, NodeNext `.js` specifiers throughout.
