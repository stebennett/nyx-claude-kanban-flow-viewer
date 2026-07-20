## CARD-022 — design: Add milestone progress to the board snapshot   [task · domain]

### Why
Completes REQ-019's snapshot shape and gives the board its per-milestone completion view. Parses `MILESTONES.md` and derives each milestone's `done`/`total` from the already-parsed `cards`, wiring a `milestones` array into the snapshot `buildSnapshot` (CARD-021) assembles — **additively**, without disturbing the existing cards/config/parseErrors walk.

### Design summary
- New **dependency-free `src/server/milestones.ts`** with two pure functions: `parseMilestones(raw)` (structural parse of `MILESTONES.md`) and `deriveMilestones(raw, cards)` (done/total from parsed card status) — no `fs`, no gray-matter.
- `parseMilestones` scans lines with **fixed anchored patterns** (`/^##\s+(M\d+.*)$/` heading, `/^\s*\*\*Cards:\*\*/` card line, `/CARD-\d+/g` ids) — deliberately **not** `extractSection`, whose unescaped-heading RegExp interpolation is a known trap and can't match dynamic `M<N> — …` headings ([CARD-019→020]).
- `done` = count of a milestone's `cardIds` whose resolved card has `status === 'done'`; `total` = `cardIds.length`. A referenced id with **no parsed card counts to `total`, never to `done`, and never throws** — mirrors ADR-0008 totality (and `readConfig`'s silent-absent branch).
- `MilestoneProgress` type lands additively in the dependency-free `card-model.ts` (ADR-0005 / [CARD-021]); `buildSnapshot` owns the one `readFileSync` and places `milestones` between `cards` and `parseErrors` (REQ-019 key order).
- 3 TDD tasks (tests-first). Note: `build-snapshot.test.ts:76` intentionally flips from `not.toHaveProperty('milestones')` to `toHaveProperty` — a modify-existing-test step, not a regression.

### Acceptance criteria (sharpened)
- **AC-1 (REQ-004):** `MILESTONES.md` parses into milestones with `name`, `cardIds`, `done`, `total`.
- **AC-2 (REQ-019):** `milestones` is correctly derived from the parsed `cards`' `status` under mixed completion (done/non-done/absent).

### ADRs in this PR
- None. `MilestoneProgress` applies ADR-0005 additively; the done-rule is a cheap-to-reverse KNOWLEDGE convention, below the ADR bar (design-check confirmed).

### Open questions / decisions deferred
None.

Full design: `docs/cards/CARD-022-milestone-progress/design.md` (in this diff). Merging this PR approves the design and unblocks implementation — the implementation branch is cut from main after this merges, and the code arrives as a second PR.

🤖 Design delivered via /kanban
