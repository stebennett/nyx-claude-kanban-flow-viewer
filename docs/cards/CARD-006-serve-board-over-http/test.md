---
verdict: pass
---
# CARD-006 — Serve the parsed board over HTTP · test (post-rework)

## Suite
`npm test`:
```
 ✓ test/ci-workflow.test.ts (6 tests)
 ✓ test/release-workflow.test.ts (15 tests)
 ✓ test/server-guard.test.ts (17 tests)   ← +7 (direct-connect number branch, fetch-block, fail-closed, IPv6)
 ✓ src/server/milestones.test.ts (12 tests)
 ✓ src/server/http-server.test.ts (6 tests)   ← +1 (?query → 200)
 ✓ src/server/parse-card.test.ts (36 tests)
 ✓ src/server/paths.test.ts (5 tests)
 ✓ src/server/build-snapshot.test.ts (24 tests)
 ✓ test/packaging.test.ts (7 tests)

 Test Files  9 passed (9)
      Tests  128 passed (128)
```

## Coverage
`npx vitest run --coverage` — overall 100% stmts / 97.95% branch / 100% funcs / 100% lines.
`http-server.ts` **100/90.9/100/100** (≥ 90% target; line 20 is the unreachable `req.url ?? '/'` TS-safety
fallback). `test/server-guard.ts` is outside coverage `include` (per design) but its 17-test suite now
reaches the previously-untested number-arg connect branch (mutation-verified in the rework).

## Lint & types & build
- `npm run lint` → ESLint: No issues found.
- `npm run typecheck` (`tsc -b --noEmit`) → clean.
- `npm run build` → Vite (30 modules) + `tsc -b tsconfig.server.json --force` → clean.

## Verdict
pass — every gate green, `http-server.ts` ≥ 90% branch, the reworked pathname dispatch + hardened
REQ-001 guard all covered.
