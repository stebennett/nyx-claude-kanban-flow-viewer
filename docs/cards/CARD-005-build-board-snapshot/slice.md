## Verdict
Split. A single-card estimate lands ~460-510 changed lines (borderline/over
`size_limit: 500`) once the fixture-board test suite is counted honestly — matching
the intake flag ("~78% of size_limit ... on the slicer's watch list"). A clean
by-acceptance-criterion seam exists: milestones parsing (AC-3, REQ-004) reads a
wholly separate source file (`MILESTONES.md`), produces an independently observable
snapshot field, and shares no invariant with the core card-walk/config/parseErrors
machinery beyond read-only use of the already-parsed `cards` array.

AC-4 (REQ-033's parseErrors handling) was deliberately NOT split further: KNOWLEDGE
`[CARD-019]` establishes `parseCard` is not total (`matter()` throws on malformed
YAML), so a board walk without the try/catch would violate REQ-033's "board never
crashes" safety property — not a smaller real slice, an unsafe intermediate one.

## Proposed slices
1. **Assemble a board snapshot from cards, config and parse errors** (task, domain,
   M2) — the board walk: per-`CARD-*`-dir single `readdir` → `entries` passed to
   `parseCard` (CARD-020 contract) → try/catch routing failures to `parseErrors`;
   `config.md` frontmatter → `config.wipLimit`; assembles
   `{generatedAt, projectName, config, cards, parseErrors}`. depends_on
   `[CARD-019, CARD-020]`. Est. 340 lines.
2. **Add milestone progress to the board snapshot** (task, domain, M2) — parses
   `MILESTONES.md` (`## <name>` headings + `**Cards:**` lines) into
   `{name, cardIds, done, total}`, `done`/`total` derived from the snapshot's own
   `cards`; wires the `milestones` array into the snapshot from slice 1.
   depends_on `["Assemble a board snapshot from cards, config and parse errors",
   CARD-019, CARD-020]`. Est. 280 lines.

Both remain in M2 — Headless board API, ahead of CARD-006 in delivery order.

## Dependency rewiring
- `CARD-006` (`depends_on: [CARD-005]`, the sole real dependent — grepped, no other
  card.md references CARD-005) rewires to `depends_on: ["Add milestone progress to
  the board snapshot"]` only. Depending on both children would be functionally
  correct but redundant, per the same advisory KNOWLEDGE already recorded against
  CARD-004's own split (`docs/cards/CARD-004-parse-card-model/slice-check.md:22`).

## Size estimates

**Child 1 — core snapshot (~340 lines)**
| File | Δ | Notes |
|---|---|---|
| `src/server/card-model.ts` | +15 | `BoardSnapshot`, `ParseError`, `BoardConfig` types |
| `src/server/build-snapshot.ts` (new) | +100 | board-dir walk, per-card try/catch around `parseCard`, `config.md` read via `matter`, snapshot assembly |
| `src/server/build-snapshot.test.ts` (new) | +225 | fixture-board helper (~50) + ~10 cases: shape, wipLimit, single/multiple malformed cards, others still parse, config default |

**Child 2 — milestones (~280 lines)**
| File | Δ | Notes |
|---|---|---|
| `src/server/card-model.ts` | +8 | `Milestone` type; `milestones` field on `BoardSnapshot` |
| `src/server/parse-milestones.ts` (new) | +65 | heading/`**Cards:**` parsing, done/total computation |
| `src/server/parse-milestones.test.ts` (new) | +155 | ~8 cases: name/cardIds, done/total counts, multiple milestones, milestone referencing an unparsed card |
| `src/server/build-snapshot.ts` | +18 | read `MILESTONES.md`, call `parseMilestones`, wire in |
| `src/server/build-snapshot.test.ts` | +35 | integration assertion that `milestones` appears correctly in the full snapshot |
