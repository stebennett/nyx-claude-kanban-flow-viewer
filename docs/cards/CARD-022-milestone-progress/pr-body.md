## CARD-022 — Add milestone progress to the board snapshot   [task · domain]

### Why
Completes REQ-019's snapshot shape and gives the board its per-milestone completion view. Parses `MILESTONES.md` and derives each milestone's `done`/`total` from the already-parsed `cards`, wiring a `milestones` array into the snapshot `buildSnapshot` (CARD-021) assembles — **additively**, without disturbing the existing cards/config/parseErrors walk. Consumed downstream by CARD-006 (UI milestones strip, REQ-031).

### What changed
- New **dependency-free `src/server/milestones.ts`** (no `fs`, no gray-matter):
  - `parseMilestones(raw)` — structural line-scan (split on `/\r\n|\n/`, **CRLF-safe**) with fixed anchored regexes (`/^##\s+(M\d+.*)$/` heading, `/^\s*\*\*Cards:\*\*/` card line, `/CARD-\d+/g` ids) — deliberately not `extractSection` (the unescaped-heading regex trap).
  - `deriveMilestones(raw, cards)` — `done` = count of a milestone's `cardIds` whose card has `status === 'done'`; `total` = `cardIds.length`. A referenced id with no parsed card counts to `total`, never `done`, never throws (ADR-0008 totality).
- `MilestoneProgress` type + `milestones` field on `BoardSnapshot` in the dependency-free `card-model.ts` (ADR-0005, additive).
- `build-snapshot.ts`: `readMilestonesRaw` (sole `readFileSync`, mirrors `readConfig`'s silent-absent → `''`), wires `deriveMilestones` in, places `milestones` between `cards` and `parseErrors` (REQ-019 key order).
- `tsconfig.test.json` include entry for the new module.

### Acceptance criteria
- [x] AC-1 (REQ-004): `MILESTONES.md` parses into `name`, `cardIds`, `done`, `total`.
- [x] AC-2 (REQ-019): `milestones` derived from parsed cards' `status` under mixed completion (done/non-done/absent).

### Testing
`milestones.test.ts` (12) + updated `build-snapshot.test.ts` — **105/105 tests green**, coverage **100% on `milestones.ts`** (overall 100/98.85/100/100). Seeded fast-check property (seed `20260720`, 50 runs) with an oracle independent of the impl. Gates: lint, `tsc -b --noEmit`, build all clean.

### Review
Full 8-lens panel. First pass caught a **CRLF blocking defect** (functionality + tests, independently): `parseMilestones` dropped all milestones on a CRLF-checked-out `MILESTONES.md`. Fixed test-first (`split('\n')` → `split(/\r\n|\n/)` + a CRLF regression test); both lenses re-ran clean. Final verdict **pass** (advisories only). ~325 changed lines — no split.

### Knowledge
`[CARD-022]` milestone-completion rule; the no-`extractSection` regex-trap gotcha; the CRLF line-scanner gotcha; the fast-check-arbitrary and CRLF-regression-literal test gotchas — see `KNOWLEDGE.md`.

🤖 Card delivered via /kanban
