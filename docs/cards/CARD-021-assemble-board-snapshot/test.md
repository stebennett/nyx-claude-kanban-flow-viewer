---
verdict: pass
---
# CARD-021 Test — Assemble a board snapshot from cards, config and parse errors (re-test after rework #1)

## Suite
`npm test` → PASS
```
Test Files  5 passed (5)
     Tests  75 passed (75)
```
build-snapshot.test.ts: 21 tests (was 18; +3 from rework #1). Key rework tests verified:
- **chmod-000 unreadable-dir regression** — "routes an unreadable (permission-denied) card dir to
  parseErrors rather than throwing (ADR-0008 totality)": RED pre-fix (EACCES thrown), GREEN after moving
  the per-card readdir inside the try (168ddbf).
- **cache-isolation** — "reports the same unchanged malformed card.md on every re-walk even with config.md
  absent": config.md omitted so only the per-card loop's clearMatterCache() runs; mutation-verified.
- **literal DEFAULT_WIP_LIMIT=3** — pinned alongside the symbol assertion; mutation-verified (changing to 7 fails).

## Coverage
`npm test -- --coverage`:
```
All files          |     100 |    98.61 |     100 |     100 |
 build-snapshot.ts |     100 |    95.45 |     100 |     100 | 8
```
100% stmts/funcs/lines, 98.61% branch (exceeds 90% core target). Line 8 = the documented `errorMessage`
dead branch (gray-matter always throws Error).

## Property tests
`property: every card dir lands in exactly one of cards/parseErrors (REQ-033)` — fast-check, PASS.

## Lint & types
`npm run lint` → ✓ no issues. `npm run typecheck` (`tsc -b --noEmit`) → ✓ (exit 0).

## Build
`npm run build` → ✓ (vite 30 modules; `tsc -b tsconfig.server.json --force`).
Rollup lockfile integrity: `grep -c 'node_modules/@rollup/rollup-' package-lock.json` = 25 ✓.

## Cleanup hygiene
No temp dirs left at mode 000 (afterEach restores `chmod 0o755` before recursive `rmSync`).

## Verdict
All gates green after rework #1. Ready for the re-run of the 4 failed lenses (design, functionality,
security, tests).
