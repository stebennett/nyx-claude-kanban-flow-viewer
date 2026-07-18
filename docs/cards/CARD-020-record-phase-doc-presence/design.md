# CARD-020 — Record phase-doc presence in the card model

## Intent
REQ-025 places a blocked card in its *underlying phase's* column, inferred from which phase
docs exist on disk when the `phase` field is not a flow value. This card exposes that scan on
the domain model CARD-019 produces: a purely-additive `phaseDocsPresent` field recording, per
phase, whether the phase doc and its check doc(s) exist — **presence only, never contents**.
This is the sibling of CARD-019 (core frontmatter+body parser) and the second child of CARD-004.

## Acceptance criteria
1. `CardModel` records, for each of the six phases (slice/design/implement/test/review/deliver),
   whether `<phase>.md` and any `<phase>-check*.md` exist in the card dir — so a blocked card's
   column can be inferred (REQ-025) without reading any doc's contents. *Testable:* a fabricated
   entries list yields the exact `phaseDocsPresent` booleans; deleting the phase- or check-match
   line flips a specific assertion.
2. The scan takes the directory listing the caller already read; `parseCard` performs **no fs
   access**. *Testable:* `parseCard(raw, { dirName: '/does/not/exist', entries: ['deliver.md'] })`
   returns `deliver.phase === true` — proving derivation from `entries`, not a readdir of `dirName`.

## In scope
- Add `phaseDocsPresent: PhaseDocsPresent` to `CardModel` (`card-model.ts`).
- Add `PHASE_NAMES` constant + `PhaseName`/`PhaseDocPresence`/`PhaseDocsPresent` types to `card-model.ts`.
- Add `entries?: readonly string[]` to `ParseCardOptions`; wire a pure `derivePhaseDocsPresent`
  into `parseCard` (`parse-card.ts`).
- Co-located Vitest tests (unit + property + parseCard integration).

## Out of scope
- The `readdir` itself and the board walk (CARD-005). `parseCard` receives entries; it never lists a dir.
- Column selection / blocked-flag rendering (CARD-011) and serving phase docs (CARD-018) — they *reuse* PHASE_NAMES.
- Any change to frontmatter/body parsing (CARD-019, shipped) or the `parseErrors` tray (CARD-005).

## Dependencies & assumptions
- Depends on CARD-019 (`parse-card.ts`, `card-model.ts`, ADR-0005) — merged on `main`.
- `entries` are **base filenames** in the card dir (e.g. `readdirSync(dir)` output), not paths. Non-`.md`
  entries, subdirectories, and `card.md` itself are ignored by construction.
- When `entries` is omitted (existing CARD-019 callers/tests), every phase defaults to `{phase:false, check:false}`.

## Approach
A fixed-shape, closed record over the six phase names — consistent with ADR-0005's explicit,
closed JSON-API contract. Chosen over:
- **`phaseDocsPresent: string[]` of matched filenames** — open-ended, leaks arbitrary check-doc
  filenames into the public JSON; harder for a consumer to test against a stable shape. Rejected.
- **`PhaseName[]` of phases whose primary doc exists** — cannot satisfy AC-1's requirement to also
  record `*-check` docs. Rejected.
- **A new `phase-docs.ts` module** — triggers the TS6307 tsconfig.test.json registration trap
  (KNOWLEDGE CARD-019) for a ~15-line addition. Rejected; extend the two existing modules.

Construction is explicit per key (no loop / no indexed access) — mirrors ADR-0005's field-by-field
mapping and sidesteps the `noUncheckedIndexedAccess` dead-branch coverage trap (KNOWLEDGE CARD-019).

## Interfaces
`card-model.ts` (additive):
```ts
export const PHASE_NAMES = ['slice', 'design', 'implement', 'test', 'review', 'deliver'] as const;
export type PhaseName = (typeof PHASE_NAMES)[number];
export interface PhaseDocPresence { phase: boolean; check: boolean; }
export type PhaseDocsPresent = { [P in PhaseName]: PhaseDocPresence };
// CardModel gains one field:  phaseDocsPresent: PhaseDocsPresent;
```
`parse-card.ts` (additive):
```ts
export interface ParseCardOptions { dirName: string; entries?: readonly string[]; }
export function derivePhaseDocsPresent(entries: readonly string[] | undefined): PhaseDocsPresent;
// private: hasCheckDoc(phase: PhaseName, names: Set<string>): boolean
//   name === `${phase}-check.md`  ||  (name.startsWith(`${phase}-check-`) && name.endsWith('.md'))
// derive builds the record with one explicit key per phase:
//   slice: { phase: names.has('slice.md'), check: hasCheckDoc('slice', names) }, …
// parseCard adds:  phaseDocsPresent: derivePhaseDocsPresent(options.entries),
```
`PHASE_NAMES` is flow order (matches REQ-024 columns); REQ-025 consumers scan it in reverse and take
the last phase with `phase === true` (deliver > … > slice), else Backlog fallback.

## Data flow
CARD-005 board walk: `readdirSync(cardDir)` → the same listing both locates `card.md` (read to `raw`)
and is passed as `entries` → `parseCard(raw, { dirName, entries })` → `derivePhaseDocsPresent` builds
a Set of the names and tests membership → `phaseDocsPresent` on the model → serialized verbatim into
`/api/board` (REQ-016) → CARD-011 infers the column. No schema/migration impact (in-memory model only).

## Implementation task list
1. **Pure derivation, red→green.** *Test* (`src/server/parse-card.test.ts`, new `describe('derivePhaseDocsPresent')`):
   - `all six phase docs + a check doc present → every phase true`
   - `empty entries [] → every phase {phase:false, check:false}`
   - `undefined entries → every phase {phase:false, check:false}` (covers the `?? []` branch, distinct from `[]`)
   - `subset ['slice.md','design.md'] → slice/design phase true, others false`
   - `check variants: 'deliver-check.md' | 'deliver-check-design.md' | 'deliver-check-2.md' each → deliver.check true`
   - `'deliver-check.md' alone → deliver.phase false, deliver.check true` (exact vs. check distinction)
   - `'deliver-check-note.txt' → deliver.check false` (endsWith('.md') guard)
   - `noise ignored: ['card.md','README.md','notes.txt','.DS_Store','attachments'] → all false`
   Run `npx vitest run` → red. *Implement* the types+`PHASE_NAMES` in `card-model.ts` and
   `derivePhaseDocsPresent`+`hasCheckDoc` in `parse-card.ts`. Re-run → green. Commit.
2. **Membership property, red→green.** *Test* (`describe('derivePhaseDocsPresent property')`, fast-check,
   `seed` fixed, `numRuns: 200`, mirroring the countCriteria property): strategy = an array drawn from
   the six `<phase>.md` names, the six `<phase>-check.md` names, and bounded noise strings; assert for
   every `p` in `PHASE_NAMES`: `result[p].phase === names.has(`${p}.md`)` and
   `result[p].check === (names.has(`${p}-check.md`) || [...names].some(n => n.startsWith(`${p}-check-`) && n.endsWith('.md')))`.
   Run → green (guards against a formula divergence). Commit.
3. **parseCard integration, red→green.** *Test* (`describe('parseCard phase-doc presence (AC-1/AC-2)')`):
   - `passes entries through: parseCard(FIXTURE, { dirName:'CARD-042', entries:['design.md','design-check.md'] }).phaseDocsPresent.design → {phase:true, check:true}` and `.deliver → {phase:false, check:false}`
   - `omitting entries defaults every phase to {phase:false, check:false}` (existing CARD-019 call shape stays valid)
   - `AC-2 purity: parseCard(FIXTURE, { dirName:'/does/not/exist', entries:['deliver.md'] }).phaseDocsPresent.deliver.phase === true` (uses entries, never reads dirName)
   *Implement* `entries?` on `ParseCardOptions` and `phaseDocsPresent` in the model literal. Re-run → green.
   Confirm the pre-existing per-field CARD-019 assertions still pass (none asserts the whole model object). Commit.
4. **Gate verification.** Run `npm run lint`, `npx tsc -b --noEmit`, `npm run build`, `npx vitest run --coverage`;
   confirm coverage on `parse-card.ts`/`card-model.ts` ≥ 90% (lines/functions/branches/statements) and paste output.
   No `tsconfig.test.json` change needed (both modules are already in `include`). Commit.

## Test strategy
- Vitest, co-located `parse-card.test.ts` (already registered in `tsconfig.test.json`). Coverage target 90%.
- **Expected values computed independently** of the code: booleans enumerated by hand per fixture above.
- **Branch coverage** (KNOWLEDGE CARD-019 — coverage % ≠ asserted): each branch of `hasCheckDoc` gets its own
  asserted fixture — exact-match true, prefix-match true, prefix-startsWith-true-but-`.md`-false (the `.txt`
  case), and no-match false — plus the `entries ?? []` undefined-vs-empty distinction.
- **Property test** on the set-membership invariant (idempotent, consistent with `Set.has`).
- **Mutation checks:** delete the `names.has(`${phase}.md`)` term → subset/purity tests fail; flip the exact
  check-match to `startsWith` (dropping the `=== `${phase}.md`` guard) → the `'deliver-check.md' alone` test
  fails (deliver.phase would go true); delete the `endsWith('.md')` guard → the `.txt` test fails; drop the
  `entries` wiring in parseCard → the AC-2 purity test fails.
- Gates: `npm run lint`, `tsc -b --noEmit`, `npm run build`, `vitest run --coverage` all green.

## Spec references
- **REQ-025** (spec.md ~L191–197) — blocked column inferred from which phase docs exist; the governing requirement.
- **REQ-020** (spec.md ~L155–162) — the card-model field contract this extends additively.
- **REQ-002 / REQ-033** — untrusted input, never crash: reinforces the parser's purity (no fs) here.
- **ADR-0005** — card-model shape + explicit mapping; explicitly names `phaseDocsPresent` and the additive
  `entries` option as this card's forward extension. No new ADR required.

## Proposed ADRs
None. ADR-0005 already governs the model shape and explicitly anticipated both the additive `phaseDocsPresent`
field and the additive `entries` option; this card executes that decision. The only local choice — placing the
canonical `PHASE_NAMES` constant in `card-model.ts` rather than `parse-card.ts` — is a convention refinement
(recorded in KNOWLEDGE), not an expensive-to-reverse architectural decision.
