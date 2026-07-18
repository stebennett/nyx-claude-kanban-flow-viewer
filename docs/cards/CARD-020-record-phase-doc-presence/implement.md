# CARD-020 — Implement

## What changed
- `src/server/card-model.ts`: added `PHASE_NAMES` (flow order: slice/design/implement/test/
  review/deliver), `PhaseName`, `PhaseDocPresence`, `PhaseDocsPresent` types, and a new
  `phaseDocsPresent: PhaseDocsPresent` field on `CardModel`.
- `src/server/parse-card.ts`: added `entries?: readonly string[]` to `ParseCardOptions`, a
  private `hasCheckDoc(phase, names)` (exact `<phase>-check.md` or `<phase>-check-*.md`
  ending `.md`), and a pure exported `derivePhaseDocsPresent(entries)` built with one
  explicit key per phase (no loop, no indexed access). Wired
  `phaseDocsPresent: derivePhaseDocsPresent(options.entries)` into the `parseCard` return
  literal. `parseCard` still performs no fs access — presence is derived only from the
  `entries` the caller passes.
- `src/server/parse-card.test.ts`: added `describe('derivePhaseDocsPresent')` (all-true,
  empty-array, undefined, subset, three check-doc variants, exact-vs-check distinction,
  `.txt` non-match, noise-ignored), `describe('derivePhaseDocsPresent property')` (fast-check,
  seed 20260718, numRuns 200, asserting the Set-membership formula), and
  `describe('parseCard phase-doc presence (AC-1/AC-2)')` (entries pass-through, omitted-entries
  default, and the AC-2 purity case with a nonexistent `dirName`).
- Confirmed the pre-existing CARD-019 tests (per-field assertions, never whole-object) still
  pass unmodified — the new field defaults to all-false when `entries` is omitted.

## Deviations from design
None. Implementation follows design.md's Interfaces/Approach/task list exactly: types and
`PHASE_NAMES` in `card-model.ts`, derivation in `parse-card.ts`, no new module, explicit
per-key record construction, plain string methods only (no `extractSection`/RegExp reuse).

## Commits
- `1aa728d` — `feat(parser): derive per-phase doc/check-doc presence (REQ-025)` — types +
  `derivePhaseDocsPresent`/`hasCheckDoc` + `parseCard` wiring + all test blocks (unit,
  property, integration), written and verified red→green together per the design's four-task
  list (all four tasks landed as one coherent, fully-tested change; gate verification below).

## Gate output

`npm run lint`
```
ESLint: No issues found
```

`npx tsc -b --noEmit`
```
TypeScript: No errors found
```

`npm run build`
```
vite v6.4.3 building for production...
✓ 30 modules transformed.
dist/ui/index.html                   0.40 kB │ gzip:  0.27 kB
dist/ui/assets/index-CWdgqL9S.css    0.10 kB │ gzip:  0.11 kB
dist/ui/assets/index-BXnY_l6R.js   194.74 kB │ gzip: 60.95 kB
✓ built in 456ms
tsc -b tsconfig.server.json --force   (exit 0)
```

`npx vitest run --coverage`
```
 Test Files  3 passed (3)
      Tests  48 passed (48)

 % Coverage report from v8
---------------|---------|----------|---------|---------|-------------------
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
---------------|---------|----------|---------|---------|-------------------
All files      |     100 |      100 |     100 |     100 |
 card-model.ts |     100 |      100 |     100 |     100 |
 parse-card.ts |     100 |      100 |     100 |     100 |
 paths.ts      |     100 |      100 |     100 |     100 |
---------------|---------|----------|---------|---------|-------------------
```
