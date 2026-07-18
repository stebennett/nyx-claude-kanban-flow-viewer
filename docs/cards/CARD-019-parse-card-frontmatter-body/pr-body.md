## CARD-019 — Parse card.md frontmatter and body into the card model   [task · domain]

Implementation PR. Split child of CARD-004 (core parse; the phase-doc scan is the sibling CARD-020).
The design PR (#7) merged; this carries the parser plus its phase docs.

> ⚠️ **Oversized PR (601 changed lines > the 500 size_limit).** `pr-splitter` was run and **refused**
> to carve it — the parser and its exhaustive test suite are coverage-coupled (ship `parse-card.ts`
> without `parse-card.test.ts` and the 90% coverage gate goes red), and that pair alone is 542 lines,
> already over the limit before any other file. `card-split-checker` independently validated the
> refusal. It ships as one thoroughly-reviewed PR by design (an oversized PR is acceptable; splitting
> reviewed code to fit is not).

### Why

The board API needs one authoritative `CardModel` built straight from a `card.md`'s frontmatter and
body, not from `BOARD.md`. This is the domain-layer parser CARD-005 assembles into the board snapshot
and serializes over `/api/board`.

### What changed

- **`src/server/parse-card.ts`** — the pure `parseCard(raw, options): CardModel` (no fs/network, so
  "never read BOARD.md" holds by construction), an explicit typed snake_case→camelCase field map with
  per-field coercion helpers, `extractSection`, and `countCriteria`.
- **`src/server/card-model.ts`** — the `CardModel` / `ReworkCounts` / `CriteriaCount` interfaces.
- **`src/server/parse-card.test.ts`** — 22 tests + a seeded fast-check property (the bulk of the diff).
- `package.json` — adds **`gray-matter`**, the project's first runtime dependency (per ADR-0005, which
  amends ADR-0002's "zero runtime deps"), and `fast-check` (dev).
- `tsconfig.test.json` — registers the two new source files (composite-project requirement).
- `test/packaging.test.ts` — the ADR-0005-sanctioned one-line update to CARD-001's deps assertion
  (now `['gray-matter']`).

### Notable design points

- **`status`/`phase`/`type`/`layer` are plain `string`** so an unrecognized status passes through
  (REQ-027 overflow / REQ-033 never-crash).
- **Additive by design:** the options-object signature lets the sibling CARD-020 add its phase-doc
  `entries` and a `phaseDocsPresent` field without changing `parseCard`'s arity.
- **`parseCard` is NOT total** — `matter(raw)` throws on malformed frontmatter. This is deliberate:
  the `parseErrors` tray (REQ-033) is **CARD-005's** job, which must wrap each `parseCard` in try/catch.

### Acceptance criteria

- [x] Frontmatter parsed with gray-matter into the model's camelCase fields (REQ-020, REQ-021)
- [x] `criteria: {done, total}` counts checkboxes under `## Acceptance criteria` only (REQ-020)
- [x] Why paragraph and Notes extracted (REQ-020, REQ-032)
- [x] A model is produced without reading BOARD.md, by construction (REQ-002)
- [x] Missing optional fields take typed defaults, never fail the parse (REQ-020)

### Testing

All gates green on a clean tree: lint 0, typecheck 0 (with `@types/gray-matter` deliberately absent —
gray-matter ships its own types), build 0, **34/34 tests**, **100% coverage** on the parser. The AC-2
heading-scoping and the `countCriteria` property are mutation-proven.

### Review

Full 8-lens panel. The first run found **one blocking finding** (tests): a designed `asDateString`
branch executed but was never asserted — a mutation blanking quoted dates survived all tests, masked by
100% coverage. Fixed (three assertions + four coercion edge-case tests) and re-reviewed clean; the fix
was independently re-verified by re-running the mutation. Security verified live (gray-matter safe-load,
no prototype pollution, no ReDoS, parser pure). Advisories ride the PR (`extractSection` regex-escaping
for future callers; `card-model.ts` field grouping; a fixture-builder refactor).

### Knowledge

`KNOWLEDGE.md` gained: `parseCard` throws → CARD-005 must wrap it (REQ-033); explicit named reads are a
prototype-pollution defense; `@types/gray-matter` doesn't exist; 100% coverage ≠ asserted. ADR-0005
(card-model shape) landed with the design PR.

🤖 Card delivered via /kanban
