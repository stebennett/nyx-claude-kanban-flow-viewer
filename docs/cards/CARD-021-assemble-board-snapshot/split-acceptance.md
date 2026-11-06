---
verdict: pass
---

# CARD-021 — Split acceptance (per-slice trace, slice mode)

_Both slices traced clean: slice 1 (types) is a faithful additive subset with zero dangling references; slice 2 (impl+tests) delivers all 3 ACs via falsifiable tests and imports resolve against a main holding slice 1. Verdict: pass → ships 2 PRs, slice 1 first._

None.
None.
**Assessment:**
1. **Traceability** — Slice 1 claims the three JSON-contract type additions (BoardConfig, ParseError, BoardSnapshot) to src/server/card-model.ts. The diff is exactly that: three pure interfaces, 17 lines, purely additive (no modification to existing CardModel/ReworkCounts/etc.). Field names and types (wipLimit: number; path/error: string; generatedAt/projectName: string, config: BoardConfig, cards: CardModel[], parseErrors: ParseError[]) match design.md's type block (design.md:57-65) verbatim, including the explicit note that milestones is deliberately absent (CARD-022's concern). Nothing extra, nothing missing.
2. **Stands alone** — no reference to build-snapshot.ts (the not-yet-shipped slice 2 module) anywhere in card-model.ts. The types have zero consumers in this slice, correct and expected. split.md's pasted slice-1-only gate evidence (lint/typecheck/test/build all EXIT:0, 54 tests green) is consistent with a type-only, consumer-free addition.
Clean, minimal, well-formed lead slice.

Checked, clean: traced all 3 acceptance criteria (AC-1 snapshot shape, AC-2 wipLimit variants, AC-3
malformed-card.md → parseErrors while others still parse) to falsifiable tests inside this slice's own
build-snapshot.test.ts — including the literal DEFAULT_WIP_LIMIT pin and the board-relative-path /
gray-matter-cache-poisoning regression tests. Confirmed the BoardConfig/ParseError/BoardSnapshot import
in build-snapshot.ts resolves against slice 1's card-model.ts additions (diffed separately). Confirmed
the tsconfig.test.json include entry matches the file this slice adds. Confirmed parseCard and the
fast-check devDependency both already exist on origin/main pre-card, so slice 2 needs nothing beyond
slice 1 to build standalone. The gray-matter cache-poisoning fix and the ADR-0008 totality test are
documented and justified in implement.md's "Deviations from design," not silent departures.
(none)
(none)

