## CARD-021 — design: Assemble a board snapshot from cards, config and parse errors   [task · domain]

### Why
The board API's foundational read: a crash-proof board walk. For each `<boardDir>/CARD-*/` dir, do one
`readdir`, read `card.md`, and call the CARD-019/020 `parseCard(raw, { dirName, entries })`; read
`config.md` for `wipLimit`; assemble the REQ-019 snapshot `{ generatedAt, projectName, config, cards,
parseErrors }`. A malformed `card.md` (or `config.md`) degrades into `parseErrors` — one bad file never
crashes the live board (REQ-033). Milestones are the sibling CARD-022 (additive seam noted).

### Design summary
- `buildSnapshot({ boardDir, projectName, now? })` in a new server-only `build-snapshot.ts` (first fs
  access in the domain layer); `BoardSnapshot`/`BoardConfig`/`ParseError` types in the dependency-free
  `card-model.ts` so the UI can `import type` the API contract without crossing the server/UI boundary.
- **Crash-proof (ADR-0008):** each `parseCard` is wrapped in try/catch → `parseErrors` ({board-relative
  path, error}); a malformed `config.md` also degrades; a valid card always parses regardless of
  siblings; an absent `config.md` → default `wipLimit` 3. The design-check advised (and the implementer
  will apply) putting `readFileSync(card.md)` inside the same try so an I/O read error also degrades —
  matching the ADR's "never throws" wording exactly.
- **Deterministic:** injectable `now?` clock (no flaky `new Date()` in assertions); `cards`/`parseErrors`
  sorted by dir name for stable client diffing (REQ-009). Single `readdir` per card dir, `entries`
  threaded to `parseCard` (CARD-020 contract). BOARD.md ignored (REQ-002).
- **Tests:** a temp fixture-board suite (real dirs, no mocks) + a fast-check property proving every card
  dir lands in exactly one of `cards`/`parseErrors` (the REQ-033 accounting invariant).

### Acceptance criteria (sharpened)
- The snapshot carries `generatedAt` (ISO), `projectName` (repo basename), `config`, `cards`,
  `parseErrors` — and NO `milestones` (REQ-019; CARD-022 adds that).
- `config.wipLimit` from `config.md` `wip_limit`; absent/missing/non-numeric → default 3; `0` passes
  through (REQ-003).
- A malformed `card.md` → `parseErrors` (board-relative path + non-empty error) while every other card
  still parses (REQ-033).

### ADRs in this PR
- ADR-0008 — The board walk is a total function: buildSnapshot degrades all file and parse failures
  into the snapshot, never throws.

### Open questions / decisions deferred
- None blocking. The design-check's one advisory (move `readFileSync` inside the per-card try for full
  I/O-error totality) is a cheap implementation detail, recorded for the implementer.
- **Note:** ADR-0008's index row lands in `docs/adrs/README.md` above where ADR-0007 (CARD-003's,
  in-flight on a separate branch) will sit — a trivial index reconcile may occur when both design PRs merge.

Full design: `docs/cards/CARD-021-assemble-board-snapshot/design.md` (in this diff). Merging this PR
approves the design and unblocks implementation.

🤖 Design delivered via /kanban
