# CARD-022 — Add milestone progress to the board snapshot — design

## Intent
Complete REQ-019's snapshot shape by deriving each milestone's completion (`done`/`total`)
from `MILESTONES.md` and the already-parsed `cards`, and wiring a `milestones` array into the
snapshot `buildSnapshot` (CARD-021) assembles — **additively**, without disturbing the existing
cards / config / parseErrors walk (KNOWLEDGE [CARD-021]). This is the sibling of CARD-021 that
carries AC-3 of the split parent (REQ-004 milestones parse); CARD-006 (UI milestone strip,
REQ-031) consumes the field.

## Acceptance criteria
- **AC-1 (REQ-004, spec §REQ-004 line 42 + §Testing line 293):** `MILESTONES.md` parses into
  milestones with `name`, `cardIds`, `done`, `total`. A milestone heading `## M<N> — <title>`
  yields `name` = the heading text (e.g. `"M1 — Toolchain and delivery pipeline"`); its
  `**Cards:**` line yields `cardIds` in listed order. *Testable:* fixture with two milestones →
  exact `name`/`cardIds` arrays; a milestone with no `**Cards:**` line → `cardIds: []`.
- **AC-2 (REQ-019, spec §REQ-019 line 141/150):** `milestones` is correctly derived from the
  parsed `cards`' `status` under mixed completion. `done` = count of the milestone's `cardIds`
  whose resolved card has `status === 'done'`; `total` = `cardIds.length`. A referenced id with no
  parsed card (missing/unparseable) counts to `total`, never to `done`, and never throws (mirrors
  ADR-0008 totality). *Testable:* fixture cards in `done` + non-`done` + absent states → exact
  `{done, total}` per milestone.

## In scope
- `MilestoneProgress` interface + `milestones` field on `BoardSnapshot` in `card-model.ts`.
- New dependency-free `src/server/milestones.ts`: pure `parseMilestones` + `deriveMilestones`.
- Reading `MILESTONES.md` (I/O edge) in `build-snapshot.ts` and wiring `deriveMilestones` in.
- Updating the one existing assertion in `build-snapshot.test.ts` that pins `milestones` absent.

## Out of scope
- The UI milestones strip / rendering (REQ-031 — CARD-006).
- Any SSE / watcher change (REQ-008 — CARD-007); `buildSnapshot` is called unchanged there.
- Milestone *ordering* logic beyond document order, milestone goal/exit-criteria text, or
  per-card milestone back-references. Deduping repeated ids on a `**Cards:**` line (machine-authored
  file; ids preserved verbatim). Counting `split`/`superseded` as done (only `status === 'done'`).

## Dependencies & assumptions
- Depends on CARD-021 (`buildSnapshot`, `BoardSnapshot`/`ParseError`/`BoardConfig` in
  `card-model.ts`) and CARD-019/020 (`CardModel`, `status` field) — all on `main`.
- `MILESTONES.md` format is `/refine`-authored and stable: `## M<N> — <title>` level-2 headings,
  each block containing one `**Cards:** CARD-…, CARD-…` line (spec §REQ-004; real file at
  `docs/cards/MILESTONES.md`). Card ids are `CARD-<digits>`; the milestone id matches `CardModel.id`.
- The spec's `status` enum (spec line 28) has exactly one terminal/completed value, `done`.

## Approach
A **pure derivation** module separated from I/O (design-for-testability): `milestones.ts` takes the
raw `MILESTONES.md` string + the parsed cards and returns `MilestoneProgress[]` with no fs/gray-matter
import; `build-snapshot.ts` owns the one `readFileSync` and calls it after the card walk.
`parseMilestones` scans lines with fixed anchored patterns — **not** `extractSection`, whose
unescaped-heading RegExp interpolation is a known trap and whose literal-heading contract can't match
dynamic `M<N> — …` headings (KNOWLEDGE [CARD-019→020]). `total` counts *listed* ids so a missing card
is visibly "not done yet" rather than silently dropped, matching REQ-031's "done/total cards" bar.
*Alternatives rejected:* (a) reuse `extractSection` per milestone — needs known literal headings and
re-engages the regex trap; (b) put `total` = only ids that resolved to a parsed card — hides an
unparseable card from its milestone's denominator, understating the plan; (c) count `split`/`superseded`
as done — not terminal in the spec enum, and cheap to reverse if ever wanted, so kept minimal (YAGNI).

## Interfaces
`card-model.ts` (additive; dependency-free JSON contract home, ADR-0005 / KNOWLEDGE [CARD-021]):
```ts
export interface MilestoneProgress { name: string; cardIds: string[]; done: number; total: number; }
export interface BoardSnapshot { /* …existing… */ cards: CardModel[]; milestones: MilestoneProgress[]; parseErrors: ParseError[]; }
```
`src/server/milestones.ts` (new, pure — imports only `type { CardModel }`):
```ts
interface ParsedMilestone { name: string; cardIds: string[]; }
export function parseMilestones(raw: string): ParsedMilestone[];
export function deriveMilestones(raw: string, cards: readonly Pick<CardModel, 'id' | 'status'>[]): MilestoneProgress[];
```
`parseMilestones`: split on `\n`; a line matching `/^##\s+(M\d+.*)$/` opens a milestone (`name` = trimmed
capture); any other `/^#{1,2}\s/` heading closes the current block (`current = null`, prevents card-line
leakage across sections); within an open block a `/^\s*\*\*Cards:\*\*/` line contributes `line.match(/CARD-\d+/g) ?? []`.
`deriveMilestones`: build `statusById = new Map(cards.map(c => [c.id, c.status]))`; map each parsed
milestone to `{ name, cardIds, total: cardIds.length, done: cardIds.filter(id => statusById.get(id) === 'done').length }`.
The `Pick<…>` param narrows the surface so fixtures need only `{id, status}` and full `CardModel[]` still satisfies it.

## Data flow
`buildSnapshot` (unchanged card/config walk) → after `cards` is built, `readMilestonesRaw(boardDir)`
(try `readFileSync(join(boardDir,'MILESTONES.md'))`; any failure → `''`, mirroring `readConfig`'s
silent-absent branch — no parseError, since line-scanning never throws) → `deriveMilestones(raw, cards)`
→ placed in the returned snapshot **between `cards` and `parseErrors`** (spec §REQ-019 key order). Empty
raw → `parseMilestones('')` → `[]` → `milestones: []`. No schema/migration; no gray-matter, so no
`clearMatterCache` concern.

## Implementation task list
1. **`parseMilestones` (structural parse).** Create `src/server/milestones.ts` + `src/server/milestones.test.ts`;
   add `"src/server/milestones.ts"` to `tsconfig.test.json`'s `include` (TS6307 for a non-test src file
   imported by a co-located test, KNOWLEDGE [CARD-019]). Write failing tests first, then implement, `npm test`, commit:
   - two-milestone fixture (`## M1 — Toolchain and delivery pipeline` + `**Cards:** CARD-001, CARD-002, CARD-003`;
     `## M2 — Headless board API` + `**Cards:** CARD-019, CARD-020`) → `parseMilestones` deep-equals
     `[{name:'M1 — Toolchain and delivery pipeline', cardIds:['CARD-001','CARD-002','CARD-003']},{name:'M2 — Headless board API', cardIds:['CARD-019','CARD-020']}]`.
   - milestone heading with no `**Cards:**` line → `cardIds: []`.
   - empty string and a `# Milestones`-only intro (no `## M` heading) → `[]`.
   - a non-milestone `## Notes` heading carrying a stray `**Cards:** CARD-999` between two milestones →
     `CARD-999` attaches to **neither** milestone (kills removal of the `current = null` terminator).
   - a `**Cards:**` line with only whitespace / no `CARD-` tokens → `cardIds: []`.
2. **`deriveMilestones` (done/total + property).** Add `MilestoneProgress` to `card-model.ts`; add
   `deriveMilestones` to `milestones.ts`; extend `milestones.test.ts`. Red→green→commit:
   - mixed statuses: cards `[{id:'CARD-001',status:'done'},{id:'CARD-002',status:'done'},{id:'CARD-003',status:'design'},{id:'CARD-019',status:'done'}]`
     (CARD-020 absent) against the two-milestone fixture → M1 `{done:2,total:3}`, M2 `{done:1,total:2}`
     (values computed by hand, not from the impl formula).
   - all referenced cards `done` → `done === total`.
   - a milestone id absent from `cards` and one whose card is `status:'backlog'` → both in `total`, neither in
     `done`; `expect(() => deriveMilestones(...)).not.toThrow()` (kills a `total = only-parsed` mutation).
   - a card whose `status` is `split` and one `superseded` → counted in `total`, NOT in `done` (pins the
     single-terminal-status rule; kills widening the done-set).
   - fast-check property (`{ seed: 20260720, numRuns: 50 }`, KNOWLEDGE [CARD-021] seed convention): over random
     milestones (arbitrary ids) × random cards with `status ∈ {done, backlog, design, split}`, assert for every
     result `0 <= done <= total`, `total === cardIds.length`, and `done === cardIds.filter(id => doneIds.has(id)).length`
     where `doneIds` is derived from the arbitrary's own generation metadata (not by retyping the impl expression,
     KNOWLEDGE [CARD-020]).
3. **Wire into `buildSnapshot`.** Add `milestones: MilestoneProgress[]` to `BoardSnapshot` in `card-model.ts`;
   import `deriveMilestones` in `build-snapshot.ts`, add `readMilestonesRaw`, place `milestones` in the return
   object between `cards` and `parseErrors`. Update `build-snapshot.test.ts` and add cases. Red→green→commit:
   - **change line 76** `expect(snap).not.toHaveProperty('milestones')` → `expect(snap).toHaveProperty('milestones')`.
   - a fixture writing `MILESTONES.md` (`## M1 — X` + `**Cards:** CARD-001, CARD-002`) plus a `done` CARD-001 and a
     `backlog` CARD-002 → `snap.milestones` deep-equals `[{name:'M1 — X', cardIds:['CARD-001','CARD-002'], done:1, total:2}]`.
   - board with **no** `MILESTONES.md` → `snap.milestones` toEqual `[]`.
   - `MILESTONES.md` referencing a card whose dir is absent → that id in `total`, `buildSnapshot` does not throw.

## Test strategy
New `src/server/milestones.test.ts` covers the pure layer to the 90% core-logic threshold (milestones.ts is
under coverage's `src/server/**/*.ts` include, not an excluded entry point); `build-snapshot.test.ts` covers the
wiring/I/O edge. Gates: `npm run lint`, `tsc -b --noEmit` (KNOWLEDGE [CARD-001] — never plain `tsc --noEmit`),
build, `npm test` all green. **Per-AC mutation kills:** AC-1 — delete the `current = null` terminator (stray-Cards
leak test reddens); swap the heading regex to non-`M` (name/cardIds tests redden). AC-2 — flip `=== 'done'` to
`!== 'done'` (mixed-status done counts wrong); change `total` to count only resolved ids (missing-card test reddens);
delete the wiring line in `buildSnapshot` (build-snapshot `toHaveProperty`/derived-value tests redden). Determinism:
no clock/network in the pure tests; property test pins a seed.

## Spec references
- `docs/spec.md` §REQ-004 (line 42) — `MILESTONES.md` supplies milestone grouping.
- `docs/spec.md` §REQ-019 (lines 141–153) — snapshot shape incl. `milestones: [{name, cardIds, done, total}]`.
- `docs/spec.md` §REQ-031 (line 233) — milestones strip done/total bar (downstream consumer, CARD-006).
- `docs/spec.md` status enum (line 28) — `done` is the terminal status; §Testing (line 293) — milestones parsing.
- ADR-0005 (card-model is the closed JSON contract, single mapping point); ADR-0008 (board walk is total).
- KNOWLEDGE [CARD-021] (snapshot contract types live in dependency-free `card-model.ts`; `milestones` additive),
  [CARD-019] (tsconfig.test include for new src files; seed convention), [CARD-019→020] (extractSection regex trap).

## Proposed ADRs
None. The `MilestoneProgress` type applies the standing decision that snapshot contract types live additively in
`card-model.ts` (ADR-0005 + KNOWLEDGE [CARD-021]) — not a new architecture decision. The `done := status === 'done'`
semantics is a one-line, cheap-to-reverse rule recorded as a KNOWLEDGE convention, below the expensive-to-reverse
ADR bar.
