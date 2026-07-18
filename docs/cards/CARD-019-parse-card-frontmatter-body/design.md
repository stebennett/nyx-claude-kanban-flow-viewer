# Design — CARD-019: Parse card.md frontmatter and body into the card model

## Intent
Build the domain-layer parser that turns one `card.md` (its gray-matter frontmatter and its
markdown body) into a single authoritative `CardModel` — the object CARD-005 assembles into the
board snapshot and serializes over `/api/board`. Frontmatter is the source of truth; `BOARD.md`
is never read (REQ-002). This is the core parse only; the phase-doc presence scan (REQ-025) is
the sibling CARD-020 and must bolt on additively.

## Acceptance criteria
Each is observable and testable; the mutation that breaks it is named in **Test strategy**.
1. Frontmatter is parsed with gray-matter into the model's camelCase fields (REQ-020, REQ-021).
2. `criteria: {done, total}` counts `- [ ]` / `- [x]` items **under the `## Acceptance criteria`
   heading only**, ignoring checkboxes elsewhere in the body (REQ-020).
3. The Why paragraph and Notes are extracted from the body into `why` / `notes` (REQ-020, REQ-032).
4. A model is produced without reading `BOARD.md` (REQ-002) — enforced by construction: `parseCard`
   takes text + options, has no fs/path input, imports no `node:fs`.
5. Missing optional frontmatter fields do not fail the parse; they take typed defaults (REQ-020).

## In scope
- `src/server/card-model.ts`: `CardModel`, `ReworkCounts`, `CriteriaCount` interfaces.
- `src/server/parse-card.ts`: `parseCard`, `extractSection`, `countCriteria`, private coercion helpers.
- `src/server/parse-card.test.ts`.
- `package.json`: add `gray-matter` (dependencies), `@types/gray-matter` + `fast-check` (devDependencies).
- `tsconfig.test.json`: register the two new source files in `include` (composite requirement).

## Out of scope
- Phase-doc presence scan / `phaseDocsPresent` field (REQ-025) — CARD-020, additive.
- Board directory walk, snapshot assembly, `parseErrors` tray (REQ-019/033) — CARD-005.
- HTTP, SSE, watcher, CLI (REQ-006/008/010–018).
- Individual acceptance-criteria **items with checked text** for the detail-panel checklist
  (REQ-032): the card's AC requires only `{done, total}`; the item list is added additively by
  the REQ-032 card, mirroring the phaseDocsPresent precedent. Model carries counts only.

## Dependencies & assumptions
- Depends on CARD-001 (TS project layout, Vitest, ESLint, tsconfig split) — present in the worktree.
- `gray-matter` uses js-yaml; the JSON API is a `CardModel` contract (proposed ADR).
- **Assumption:** the `blocker` reason lives in a frontmatter `blocker:` string key written by
  `/kanban` when parking (kanban SKILL.md §"Card frontmatter … status/blocker"); the model maps it
  when non-empty. Not in the card's AC; low-risk, additive if the source ever changes.
- **Assumption:** `dirName` (card directory basename) is supplied by the caller, not derived by fs.

## Approach
gray-matter splits the raw text once into `{ data, content }`. An **explicit** field-by-field map
turns `data` (snake_case) into the camelCase model with per-field coercion and defaults; body
extraction reads `content`. Both consume the one parse pass (the shared invariant the slice kept
together). `parseCard` is pure — no fs, no network.

Alternatives considered:
1. **Generic snake→camel transform over all keys** — rejected: leaks unmodeled keys (`reqs`,
   `right_sized`, `review_lenses_failed`) into the public JSON, can't apply per-field
   coercion/defaults (Date→string, nested `reworks`, `null` line counts), weak typing.
2. **`parseCard` does its own `readdir` for dirName / phase docs** — rejected: couples domain logic
   to I/O, needs fs to test, and the phase-doc scan belongs behind an injectable input (CARD-020).
3. **Store full criteria items now for REQ-032** — rejected as YAGNI/out-of-scope; added additively
   by its own card.

## Interfaces
`src/server/card-model.ts`:
```ts
export interface ReworkCounts { slice: number; design: number; implement: number; split: number; deliver: number; }
export interface CriteriaCount { done: number; total: number; }
export interface CardModel {
  id: string; title: string; status: string; phase: string; type: string; layer: string;
  dependsOn: string[]; branch: string; worktree: string;
  designPrUrl: string; prUrls: string[]; splitSlices: number; adrs: string[];
  reworks: ReworkCounts; estimatedLines: number | null; actualLines: number | null;
  criteria: CriteriaCount; why: string; notes: string; blocker?: string;
  created: string; started: string; delivered: string; dirName: string;
}
```
`src/server/parse-card.ts`:
```ts
export interface ParseCardOptions { dirName: string; } // CARD-020 adds `entries: string[]` additively
export function parseCard(raw: string, options: ParseCardOptions): CardModel;
export function extractSection(content: string, heading: string): string; // '' when heading absent
export function countCriteria(sectionText: string): CriteriaCount;
```
- `status`/`phase`/`type`/`layer` are `string` (not unions): unknown values pass through for the
  REQ-027 overflow column / REQ-033 robustness.
- Private helpers: `asString`, `asStringArray`, `asNumberOrNull`, `asNonNegInt`, `asDateString`
  (Date→`toISOString().slice(0,10)`, string passthrough, else `''`), `asReworks` (fills each
  producer with 0). `blocker` set only when the frontmatter value is a non-empty string.
- `extractSection`: from the line matching `^##\s+<heading>\s*$`, collect until the next line
  matching `^#{1,2} ` (a `###` sub-heading does NOT terminate), return trimmed body.
- `countCriteria`: `done` = lines matching `^\s*-\s\[[xX]\]`; `total` = `done` + lines matching
  `^\s*-\s\[ \]`.

## Data flow
raw `card.md` text (read by CARD-005) + `{ dirName }` → `matter(raw)` → `{ data, content }` →
explicit map(data)→camelCase fields (coerced/defaulted) ⊕ `extractSection(content,'Why')`,
`extractSection(content,'Notes')`, `countCriteria(extractSection(content,'Acceptance criteria'))`
→ `CardModel`. No fs, no BOARD.md, no network. Consumed by CARD-005 → `/api/board` JSON
(REQ-016/019) → UI. No DB/schema/migration; the "schema" is the CardModel JSON contract (proposed ADR).

## Implementation task list
Test-first; each task is one red→green→commit cycle. Run `npx vitest run src/server/parse-card.test.ts`
after each edit; gate commands: `npm run lint`, `npx tsc -b --noEmit`, `npm run test:coverage`.
1. **Dependencies.** Edit `package.json`: `gray-matter` → `dependencies`; `@types/gray-matter`,
   `fast-check` → `devDependencies`. `npm install`. Verify `npm ls gray-matter` resolves. Commit.
   (No tsconfig edit yet — the source files don't exist; adding a missing path errors TS6053.)
2. **Core frontmatter map (happy path).** Write `parse-card.test.ts` with `it('maps every
   frontmatter field snake→camel with correct types')` over a full-fields fixture → red (module
   missing). Create `card-model.ts` (all interfaces) and `parse-card.ts` (gray-matter split +
   explicit map + coercion helpers; `why=''`, `notes=''`, `criteria={done:0,total:0}` stubbed).
   Add `"src/server/card-model.ts"` and `"src/server/parse-card.ts"` to `tsconfig.test.json`
   `include`. Green. `tsc -b --noEmit` + lint green. Commit.
3. **Defaults & robustness.** Add tests: missing-optionals fixture asserts every default and
   `expect(() => parseCard(...)).not.toThrow()`; partial `reworks` fills 0s; `estimated_lines: ""`
   → `null`; `blocker` present/absent; unknown status passthrough. Implement full coercion. Commit.
4. **Date coercion.** Add `it('coerces unquoted YAML date frontmatter to YYYY-MM-DD strings')`
   → red (Date). Add `asDateString`, wire created/started/delivered. Green. Commit.
5. **Why & Notes extraction.** Add tests for `extractSection` and `parseCard` why/notes → red.
   Implement `extractSection`, wire. Green. Commit.
6. **Criteria counting scoped to heading.** Add scoping/uppercase/absent/`###`-subheading tests →
   red. Implement `countCriteria` over `extractSection('Acceptance criteria')`. Green. Commit.
7. **Property test.** Add a fast-check property for `countCriteria` (below). Commit.
8. **Gates.** `npm run test:coverage` ≥90% (lines/functions/branches/statements); add an edge test
   for any uncovered branch. `npm run lint`, `npx tsc -b --noEmit`, `npm test` all green. Commit.

## Test strategy
Fixtures are inline template-literal strings (parser is pure — no temp files); this also
demonstrates AC-4 (a model is produced from text alone). Coverage target 90% on the core-logic
layer (`src/server/**/*.ts` minus `index.ts`); this file is core logic. Gates: ESLint,
`tsc -b --noEmit`, Vitest. Enumerated assertions (expected values computed by hand from fixtures):
- **AC-1:** full-fields fixture → `id`, `title`, `status`, `dependsOn: ['CARD-001']`,
  `prUrls: [<url>]`, `splitSlices: 2`, `adrs: ['ADR-0007']`,
  `reworks` deep-equals `{slice:1,design:0,implement:2,split:0,deliver:0}`, `estimatedLines: 300`,
  `actualLines: 280`, `dirName` from options. Mutation: delete a map line → that field undefined.
- **AC-5 / defaults:** minimal fixture (only `id`,`title`,`status`) → `dependsOn:[]`, `prUrls:[]`,
  `adrs:[]`, `splitSlices:0`, `reworks` all-0, `estimatedLines:null`, `actualLines:null`,
  `criteria:{done:0,total:0}`, `why:''`, `notes:''`, `branch/worktree/designPrUrl/created/
  started/delivered:''`, and `not.toThrow()`. Mutation: drop a default → throws or `undefined`.
- **Date coercion (AC-1):** `created: 2026-07-18` (unquoted) → `expect(typeof m.created).toBe('string')`
  and `expect(m.created).toBe('2026-07-18')`. Mutation: remove `asDateString` → value is a `Date`,
  `typeof === 'object'`, assertion fails.
- **Status robustness (REQ-027):** `status: frobnicate` → `m.status === 'frobnicate'` (not thrown,
  not blanked). Mutation: add a whitelist that blanks unknowns → fails.
- **Blocker:** `blocker: needs API key` → `m.blocker === 'needs API key'`; absent/empty → `m.blocker`
  is `undefined`. Two assertions.
- **AC-2 scoping:** fixture with 2 `- [x]` + 3 `- [ ]` under `## Acceptance criteria` **and** a
  stray `- [x]` on its own line in both `## Why` and `## Notes` → `criteria` equals
  `{done:2, total:5}`. Mutation: remove heading scoping → `{done:4, total:7}`, fails.
- **AC-2 uppercase / absent / sub-heading:** `- [X]` counts as done (`{done:1,total:2}`); no
  `## Acceptance criteria` → `{done:0,total:0}`; a `### sub` inside the section does not end it
  (a checkbox after it is still counted).
- **AC-3:** clean single-paragraph fixture → `m.why === '<exact sentence>'` and
  `m.notes === '<exact notes text>'`, neither containing its `##` heading. Mutation: off-by-one in
  `extractSection`'s terminator → heading text bleeds in, assertion fails.
- **Property (fast-check):** generate `c` checked + `u` unchecked checkbox lines plus arbitrary
  non-checkbox noise lines, shuffle, join → `countCriteria(section)` returns `{done: c, total: c+u}`;
  invariants `done <= total`, `done >= 0`, `total >= 0`. `c`,`u` are controlled by the generator,
  independent of the implementation formula. Constrain strategy to valid line shapes.

## Spec references
- REQ-002 (frontmatter is source of truth; BOARD.md ignored), REQ-020 (card model fields),
  REQ-021 (gray-matter; PR state inferred not queried) — primary.
- REQ-006 (server-half package structure), REQ-016/019 (snapshot/JSON contract → ADR rationale),
  REQ-027 (unrecognized status → overflow, string-typed status), REQ-033 (never crash on one card),
  REQ-032 (detail-panel needs branch/worktree/adrs/why/notes → model carries them).
- KNOWLEDGE: CARD-001 (`tsc -b --noEmit`; composite `tsconfig.test.json` include; `dependencies`
  empty until first runtime dep; coverage = core-logic layer), CARD-004 (snake→camel single
  mapping point). ADR-0001/0002/0003 (ESM, build layout, typecheck) — binding, unaffected.

## Proposed ADRs
### Card model shape and the explicit snake_case→camelCase frontmatter mapping
**Context.** card.md frontmatter is the single source of truth (REQ-002/020/021). The parsed
`CardModel` is serialized verbatim into `/api/board` (REQ-016/019) and consumed by the whole UI and
by every downstream card (CARD-005 snapshot, CARD-011 blocked flag, CARD-018 docs, CARD-020
phase-doc scan) — an expensive-to-reverse cross-cutting contract. Frontmatter keys are snake_case;
this parser is the single mapping point to camelCase (KNOWLEDGE CARD-004). The model must tolerate
unknown/renamed status values (REQ-027 overflow, REQ-033 never crash) and be forward-extensible
(CARD-020 adds `phaseDocsPresent`).
**Decision.** Define `CardModel` (+ `ReworkCounts`, `CriteriaCount`) in `card-model.ts` with the
REQ-020 fields plus body-derived `why`/`notes` and detail-panel `branch`/`worktree`/`adrs`
(REQ-032/018), all camelCase; `status`/`phase`/`type`/`layer` are plain `string` (no unions) so
unrecognized values pass through. Map frontmatter with an **explicit** field-by-field mapping and
per-field coercion/defaults (missing optionals never throw), never a generic key transform: string
`''`; string[] `[]`; `number|null` line counts; `splitSlices` `0`; a fully-defaulted `reworks`;
date-ish fields coerced to `'YYYY-MM-DD'` strings; `blocker` optional (set only when non-empty).
The entry point `parseCard(raw: string, options: ParseCardOptions): CardModel` takes an options
object so CARD-020 adds `entries` additively without changing arity or the no-I/O contract.
`parseCard` performs no filesystem or network access — `BOARD.md` is unreachable by construction.
**Consequences.** Single greppable mapping point; downstream cards extend additively rather than
redesigning. Explicit mapping stops unmodeled/mistyped keys leaking into the public JSON API and
gives per-field control (dates, nested reworks, null line counts). String-typed status keeps the
parser robust to vocabulary drift. Purity makes the domain layer testable from string fixtures with
no temp files or mocks. Cost: the map is hand-maintained against the frontmatter schema.
**Supersedes:** none.
