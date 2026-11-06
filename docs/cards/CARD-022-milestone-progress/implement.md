# CARD-022 — Milestone progress in the board snapshot — implement

## What changed
- Added `src/server/milestones.ts` (new, dependency-free — no fs, no gray-matter):
  - `parseMilestones(raw)`: structural line-scan of `MILESTONES.md`, splitting on `/\r\n|\n/`
    (CRLF-safe), using fixed anchored regexes (`/^##\s+(M\d+.*)$/` heading, `/^\s*\*\*Cards:\*\*/`
    card line, `/CARD-\d+/g` id extraction) — deliberately not `extractSection` (unescaped-heading
    regex trap, KNOWLEDGE [CARD-019→020]).
  - `deriveMilestones(raw, cards)`: builds `statusById` from the parsed cards, maps each parsed
    milestone to `{ name, cardIds, total: cardIds.length, done: count of cardIds whose
    card.status === 'done' }`. Never throws on a missing/unresolved card id.
- Added `MilestoneProgress` interface to `src/server/card-model.ts` (the dependency-free
  JSON-contract home, ADR-0005) and added `milestones: MilestoneProgress[]` to `BoardSnapshot`.
- `src/server/build-snapshot.ts`: added `readMilestonesRaw(boardDir)` (try
  `readFileSync(join(boardDir,'MILESTONES.md'))`, any failure → `''`, mirroring `readConfig`'s
  silent-absent branch), imported `deriveMilestones`, and placed `milestones` in the returned
  snapshot between `cards` and `parseErrors`.
- Registered `src/server/milestones.ts` in `tsconfig.test.json`'s `include` (TS6307).
- `src/server/build-snapshot.test.ts`: flipped line 76 `not.toHaveProperty('milestones')` →
  `toHaveProperty('milestones')`; added 3 cases (derived-value fixture, no-`MILESTONES.md` → `[]`,
  missing-card-dir counts to `total` without throwing).
- `src/server/milestones.test.ts` (new): `parseMilestones` tests (incl. the CRLF regression) +
  `deriveMilestones` tests (mixed statuses hand-computed, all-done, missing+backlog never-throws,
  split/superseded not counted, seeded fast-check property seed `20260720`).

## Deviations from design
None. Task order, interfaces, and snapshot key-order placement match design.md verbatim.

## Rework
The review panel returned a BLOCKING finding (functionality + tests lenses, both confirmed):
`parseMilestones` split `MILESTONES.md` on a bare `'\n'`, leaving a trailing `\r` on every line for a
CRLF-checked-out file (e.g. git-for-Windows `core.autocrlf=true`). No pattern matches a line with a
trailing `\r` (`.` excludes `\r`; JS `$` without `m` won't match before it), so every `## M<N> — …`
heading fell through to the terminator branch and `parseMilestones` silently returned `[]` for a valid
CRLF file (reproduced: `parseMilestones('## M1 — X\r\n**Cards:** CARD-001…')` → `[]` before the fix).

**Fix (test-first):**
1. Added a failing CRLF regression test to `milestones.test.ts` (CRLF-joined two-milestone fixture →
   same result as the LF fixture). Watched it fail (`expected [] to deeply equal [...]`).
2. Fixed `milestones.ts`: `raw.split('\n')` → `raw.split(/\r\n|\n/)` (normalize at the split, not the
   regexes). Test green; no existing assertion weakened.
3. Folded in both advisory nits: a comment on the `ANY_HEADING_PATTERN` terminator branch, and a
   comment pinning that `headingMatch[1]` is mandatory (no `?`) so `!` is sound.
4. No new imports; module stays pure.

## Commits
- `22fac95` feat(server): parse MILESTONES.md structurally
- `188477a` feat(server): derive per-milestone done/total counts
- `6892396` feat(server): wire milestones into buildSnapshot
- `ed03641` fix(server): parse CRLF-lineended MILESTONES.md (rework)

## Gate evidence (post-rework)
```
$ npm run lint            → ESLint: No issues found
$ npm run typecheck       → tsc -b --noEmit (clean)
$ npm run build           → vite (30 modules) + tsc -b tsconfig.server.json --force (clean)
$ npm test                → Test Files 7 passed (7) · Tests 105 passed (105)
$ npx vitest run --coverage
  All files          |     100 |    98.85 |     100 |     100 |
   milestones.ts     |     100 |      100 |     100 |     100 |
```
(build-snapshot.ts line 9 `String(err)` fallback is pre-existing/unrelated. Test count 104 → 105 with the CRLF test.)
