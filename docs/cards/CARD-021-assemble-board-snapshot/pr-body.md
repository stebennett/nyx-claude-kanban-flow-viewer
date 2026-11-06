## CARD-021 — Assemble a board snapshot from cards, config and parse errors (slice 2 of 2)   [task]

_Second and final slice of a 2-way carve (branch was 507 lines, 7 over the 500 cap). **Slice 1 — the `BoardConfig`/`ParseError`/`BoardSnapshot` types — shipped in #45** and is already on `main`; this slice adds the implementation that consumes them. See `split.md`._

### Why
`buildSnapshot` walks the board directory and assembles a complete board snapshot — `generatedAt`, `projectName`, `config`, `cards`, `parseErrors` — as a **total function**: every file-read and parse failure is degraded into `parseErrors` rather than thrown, so one malformed `card.md` can never take down the walk (ADR-0008).

### What changed
- `src/server/build-snapshot.ts` — the `buildSnapshot` total function (+85).
- `src/server/build-snapshot.test.ts` — its exhaustive Vitest suite (+404): snapshot shape, `wipLimit` variants, and the malformed-card-still-parses-the-rest regression, plus the board-relative-path and gray-matter cache-poisoning regressions.
- `tsconfig.test.json` — registers `build-snapshot.ts` in `include` (the TS6307 fix; inseparable from the file existing).

### Acceptance criteria (all three delivered by this slice's tests)
- [x] A snapshot carries `generatedAt`, `projectName`, `config`, `cards`, `parseErrors` (REQ-019; `milestones` is CARD-022's)
- [x] `config.wipLimit` is read from `config.md` frontmatter (REQ-003)
- [x] A malformed `card.md` lands in `parseErrors` with path and error while every other card still parses (REQ-033)

### Testing
`build-snapshot.test.ts` — 21 tests covering all three ACs via falsifiable assertions (incl. the `DEFAULT_WIP_LIMIT` pin and the cache-poisoning/board-relative-path regressions). Full suite green on the cumulative branch (slices 1+2): lint, typecheck, 75 tests, build — all EXIT:0 (`split.md`).

### Review
Full opus lens panel passed on the whole branch before the carve; the per-slice `[acceptance]` re-run traced all three ACs to tests inside this slice and confirmed its `BoardConfig`/`ParseError`/`BoardSnapshot` imports resolve against slice 1 on `main` (`split-acceptance.md`, verdict: pass).

### Knowledge
`[CARD-021]` ADR-0008 (buildSnapshot totality); gray-matter cache-poisoning gotcha — see `KNOWLEDGE.md`.

🤖 Card delivered via /kanban
