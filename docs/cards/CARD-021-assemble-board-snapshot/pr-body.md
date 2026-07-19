## CARD-021 — Assemble a board snapshot from cards, config and parse errors (slice 1 of 2: types)   [task · domain]

### Why
The board API's foundational read needs a snapshot contract before any consumer (`GET /api/board`, the
SSE stream, the UI) can depend on it. This slice ships **only the JSON-contract type shapes** — the
board walk that produces them is the sibling **slice 2** (`build-snapshot.ts` + its test suite), which
merges next, onto a `main` that already carries these types.

### What changed
- `src/server/card-model.ts` (+17): three new exported interfaces appended to the dependency-free
  JSON-contract type module (ADR-0005's home for `CardModel`/`PhaseDocsPresent`):
  - `BoardConfig` — `{ wipLimit: number }` (from `config.md`, REQ-003).
  - `ParseError` — `{ path: string; error: string }` (board-relative path; the REQ-019/REQ-033 tray).
  - `BoardSnapshot` — `{ generatedAt; projectName; config; cards; parseErrors }` (REQ-019). The
    `milestones` field is deliberately absent — it is CARD-022's additive extension, not this card's.
- Purely additive: no existing type is modified, and nothing consumes these interfaces yet.

### Acceptance criteria
The card's three behavioral criteria (snapshot assembly, `config.wipLimit`, malformed-card handling) are
delivered by **slice 2's** implementation and tests. This slice provides the type shapes they satisfy:
- [x] `BoardSnapshot` carries `generatedAt`/`projectName`/`config`/`cards`/`parseErrors`, no `milestones` (REQ-019)
- [x] `BoardConfig.wipLimit` shape for the `config.md` read (REQ-003)
- [x] `ParseError` `{path, error}` shape for the parse-failure tray (REQ-019, REQ-033)

### Testing
Standalone-green as a type-only, consumer-free addition: lint, `tsc -b --noEmit`, `npm test` (54 tests),
and build all pass with only this slice applied to `origin/main` (see `split.md`'s pasted slice-1 gate
output; `split-acceptance.md` confirms the slice traces to its claim and stands alone).

### Review
Split of an oversized card (507 lines, 7 over the 500 cap) into 2 whole-file slices. Full 8-lens review
panel on the whole card: **pass** (the totality bug and three test-strength gaps found and reworked).
Split-check: **pass** (all 6 SPL-*). Per-slice acceptance trace: **pass**. ADR-0008 (the board walk is a
total function) governs the behavior that lands in slice 2.

### Knowledge
KNOWLEDGE [CARD-021]: gray-matter cache-poisoning guard; readdir-sort determinism; the types-lead-slice
split convention; the SPL-GREEN pasted-output requirement.

🤖 Card delivered via /kanban (slice 1 of 2)
