# CARD-022 — Milestone progress in the board snapshot — implement

## What changed
- Added `src/server/milestones.ts` (new, dependency-free — no fs, no gray-matter):
  - `parseMilestones(raw)`: structural line-scan of `MILESTONES.md` using fixed anchored
    regexes (`/^##\s+(M\d+.*)$/` heading, `/^\s*\*\*Cards:\*\*/` card line, `/CARD-\d+/g`
    id extraction) — deliberately not `extractSection` (unescaped-heading regex trap,
    KNOWLEDGE [CARD-019→020]).
  - `deriveMilestones(raw, cards)`: builds `statusById` from the parsed cards, maps each
    parsed milestone to `{ name, cardIds, total: cardIds.length, done: count of cardIds
    whose card.status === 'done' }`. Never throws on a missing/unresolved card id.
- Added `MilestoneProgress` interface to `src/server/card-model.ts` (the dependency-free
  JSON-contract home, ADR-0005) and added `milestones: MilestoneProgress[]` to
  `BoardSnapshot`.
- `src/server/build-snapshot.ts`: added `readMilestonesRaw(boardDir)` (try
  `readFileSync(join(boardDir,'MILESTONES.md'))`, any failure → `''`, mirroring
  `readConfig`'s silent-absent branch), imported `deriveMilestones`, and placed
  `milestones` in the returned snapshot between `cards` and `parseErrors`.
- Registered `src/server/milestones.ts` in `tsconfig.test.json`'s `include` (TS6307 for a
  non-test src file imported by a co-located test).
- `src/server/build-snapshot.test.ts`: flipped line 76 from
  `expect(snap).not.toHaveProperty('milestones')` to `toHaveProperty('milestones')`; added
  3 cases — derived-value fixture, no-`MILESTONES.md` (→ `[]`), and a milestone id with no
  matching card dir (counts to `total`, `buildSnapshot` does not throw).
- `src/server/milestones.test.ts` (new): 6 `parseMilestones` tests (two-milestone fixture,
  no-`**Cards:**` line, empty string, intro-only, stray-`**Cards:**`-under-non-milestone-
  heading, whitespace/no-token `**Cards:**` line) + 5 `deriveMilestones` tests (mixed
  statuses hand-computed, all-done, missing+backlog card never-throws, split/superseded
  not counted, seeded fast-check property `{ seed: 20260720, numRuns: 50 }` deriving
  expected `done` from the arbitrary's own status tags, not the impl expression).

## Deviations from design
None. Task order, interfaces (`ParsedMilestone`, `parseMilestones`, `deriveMilestones`
signature incl. the `Pick<CardModel,'id'|'status'>` narrowing), and the snapshot
key-order placement all match design.md verbatim.

## Commits
- `22fac95` feat(server): parse MILESTONES.md structurally
- `188477a` feat(server): derive per-milestone done/total counts
- `6892396` feat(server): wire milestones into buildSnapshot

## Gate evidence (real output, this worktree)
```
$ npm run lint
ESLint: No issues found

$ npm run typecheck
> tsc -b --noEmit
(no output — clean)

$ npm run build
> vite build
✓ 30 modules transformed. ... ✓ built in 412ms
> tsc -b tsconfig.server.json --force
(no output — clean)

$ npm test
Test Files  7 passed (7)
     Tests  104 passed (104)

$ npx vitest run --coverage
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |     100 |    98.85 |     100 |     100 |
 build-snapshot.ts |     100 |    95.83 |     100 |     100 | 9
 card-model.ts     |     100 |      100 |     100 |     100 |
 milestones.ts     |     100 |      100 |     100 |     100 |
 parse-card.ts     |     100 |      100 |     100 |     100 |
 paths.ts          |     100 |      100 |     100 |     100 |
-------------------|---------|----------|---------|---------|-------------------
```
(Line 9 of build-snapshot.ts, `String(err)` fallback in `errorMessage`, is pre-existing
and unrelated to this card's changes — coverage on `milestones.ts` itself is 100/100/100/100.)
