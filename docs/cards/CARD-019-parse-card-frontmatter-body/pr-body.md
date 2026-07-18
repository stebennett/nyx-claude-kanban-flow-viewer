## CARD-019 — design: Parse card.md frontmatter and body into the card model   [task · domain]

Split child of CARD-004 (which was carved into CARD-019 + CARD-020 at slice). This is the core parse.

### Why

The board API needs one authoritative `CardModel` built straight from a `card.md`'s frontmatter and
body, not from `BOARD.md`. This card is the domain-layer parser CARD-005 assembles into the board
snapshot and serializes over `/api/board`. It carries AC-1..5 of the parent CARD-004; the phase-doc
presence scan (REQ-025) is the sibling CARD-020, which depends on this.

### Design summary

- **A pure function** `parseCard(raw: string, options: ParseCardOptions): CardModel` — text in, no
  filesystem or network. This makes REQ-002 ("never read BOARD.md") true *by construction*, and lets
  the whole domain layer be tested from inline string fixtures with no temp files.
- **An explicit, typed snake_case→camelCase field map** (not a generic key transform): the model is a
  closed JSON API contract, so unmodeled keys are deliberately dropped and every field gets its own
  coercion + default. Missing optionals never throw.
- **`status`/`phase`/`type`/`layer` are plain `string`** (no unions) so an unrecognized status passes
  through untouched — REQ-027's overflow column and REQ-033's never-crash both depend on that.
- **Additive by design:** the options object lets CARD-020 add its phase-doc `entries` and a
  `phaseDocsPresent` field without changing `parseCard`'s arity or its no-I/O contract — the whole
  premise of the CARD-004 split.
- **Two traps handled:** unquoted ISO dates parse to JS `Date` and are coerced to `'YYYY-MM-DD'`
  strings (a `Date` leaking into the JSON API would be a defect); and the composite `tsconfig.test.json`
  must list the new source files explicitly (TS6307), mirroring the `paths.ts` precedent.

### Acceptance criteria (sharpened)

- **AC-1** — frontmatter parsed with gray-matter into the model's camelCase fields. (REQ-020, REQ-021)
- **AC-2** — `criteria: {done, total}` counts checkboxes **under `## Acceptance criteria` only**,
  ignoring checkboxes elsewhere in the body. (REQ-020)
- **AC-3** — the Why paragraph and Notes are extracted into `why` / `notes`. (REQ-020, REQ-032)
- **AC-4** — a model is produced without reading `BOARD.md`, enforced by construction (pure fn, no fs). (REQ-002)
- **AC-5** — missing optional frontmatter fields take typed defaults, never fail the parse. (REQ-020)

### ADRs in this PR

- **ADR-0005** — Card model shape and the explicit snake_case→camelCase frontmatter mapping. It also
  **amends ADR-0002's** "zero runtime deps" consequence: `gray-matter` (added here) is the project's
  first runtime dependency. Not a reversal of the build/publish layout — a consequence-scope amendment.

### Open questions / decisions deferred

None open. The design check passed with **no blocking findings** and two advisories (in
`design-check.md` in this diff): the ADR-0002 amendment above (actioned — ADR-0005 carries the note),
and a suggestion to pin the fast-check property's seed for reproducibility (a test detail to apply at
implementation).

Note: this PR adds an `ADR-0005` row to `docs/adrs/README.md`. CARD-002's in-flight design PR (#6) adds
an `ADR-0004` row to the same file — whichever merges second will need a trivial rebase of that table.

Full design: `docs/cards/CARD-019-parse-card-frontmatter-body/design.md` (in this diff). Merging this
PR approves the design; the implementation branch is cut from main after merge and the parser arrives
as a second PR.

🤖 Design delivered via /kanban
