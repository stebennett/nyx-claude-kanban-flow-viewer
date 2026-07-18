# Slice: CARD-004 — Parse a card.md into the card model

## Verdict
**Split** into two children, both `layer: domain`, both milestone M2. The whole card's
own 393-line intake estimate (79% of `size_limit`) plus 6 acceptance criteria (over the
">5" calibration signal) triggered a closer look; re-estimating against the real tree
confirms two behaviourally distinct, independently testable pieces rather than one.

## Proposed slices

**1. Parse card.md frontmatter and body into the card model** (AC-1,2,3,4,5 — REQ-002,
REQ-020, REQ-021). The core gray-matter mapping: frontmatter fields → camelCase model
fields with defaults for missing optionals, plus body-text extraction (Why, Notes,
acceptance-criteria done/total scoped to the `## Acceptance criteria` heading). One
cohesive function operating on gray-matter's single `{ data, content }` output — not
further divisible without breaking the "share one invariant" rule (frontmatter mapping
and body extraction both consume the same parse pass).

**2. Record phase-doc presence in the card model** (AC-6 — REQ-025). A `readdir` scan
of the card dir against the canonical phase-doc filename set, added as a field on the
same `CardModel`. Genuinely severable: different REQ, different I/O shape (filesystem
presence vs. YAML/text parsing), different downstream consumer (CARD-011, M3) than
slice 1's consumer (CARD-005, M2's board-snapshot assembly). Purely additive to slice
1's model — no redesign of `parseCard()`'s signature.

Split pattern used: **by acceptance criterion**, isolating the one AC whose Notes
already flag it as a distinct, later-bolted-on requirement (REQ-025 vs REQ-020/021).
Not split further: splitting frontmatter-field-mapping from Why/Notes/criteria-counting
would separate pieces that share the same parse invariant (both read `content` from the
same gray-matter call) for no size benefit — both stay in slice 1.

## Dependency rewiring
- CARD-005 (Build a board snapshot from the board directory) currently `depends_on:
  [CARD-004]`. After the split it needs the complete model (it assembles the full
  parsed-card array into the snapshot, including the phase-doc-presence field it merely
  passes through), so `new_depends_on: [<slice 1>, <slice 2>]`.

## Size estimates

### Slice 1 — Parse card.md frontmatter and body into the card model
| File | Lines | Notes |
|---|---|---|
| `src/server/card-model.ts` (new) | ~38 | `CardModel`, `ReworkCounts`, `CriteriaCount` interfaces (no `phaseDocsPresent` yet) |
| `src/server/parse-card.ts` (new) | ~72 | `extractSection`, `countCriteria`, `parseCard` frontmatter→model mapping |
| `src/server/parse-card.test.ts` (new) | ~185 | 9 cases: full-fields happy path, missing-optionals, criteria scoped to heading (ignoring checkboxes elsewhere), Why extraction, Notes extraction, parse succeeds with no BOARD.md present, array-field defaults, reworks default object, dirName |
| `package.json` | ~1 | add `gray-matter` to `dependencies` (first runtime dep, per CARD-001 KNOWLEDGE.md) |
| **Total** | **~296** | rounds to 300; 60% of `size_limit` |

### Slice 2 — Record phase-doc presence in the card model
| File | Lines | Notes |
|---|---|---|
| `src/server/card-model.ts` (extend) | ~16 | `PhaseDocsPresent` interface (11 booleans) + field on `CardModel` |
| `src/server/parse-card.ts` (extend) | ~32 | `PHASE_DOC_FILES` map, `scanPhaseDocs`, wire into `parseCard`'s return, reusing the existing directory read |
| `src/server/parse-card.test.ts` (extend) | ~95 | 5 cases: none present, some present, all present incl. `*-check.md`, dirName unaffected, no second `readdir` (design-note regression guard) |
| **Total** | **~143** | rounds to 145; 29% of `size_limit` |

Combined ~445 (vs. the whole card's 393-line intake estimate) — the delta is expected
split overhead (duplicate `describe` scaffolding, a second temp-dir test helper), and
both children land with real margin under the cap rather than the parent's 79%.
