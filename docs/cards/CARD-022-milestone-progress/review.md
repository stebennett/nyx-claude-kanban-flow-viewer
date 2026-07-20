---
verdict: pass
review_lenses_failed: [functionality, tests]
---
# CARD-022 — Review panel (full, 8 lenses)

**Incomplete** — the `functionality` and `tests` sections were stripped after their blocking CRLF
finding was reworked (fix `ed03641`); both lenses re-run against the reworked branch, and their new
sections merge back here. The 6 sections below passed on the pre-rework diff and are unchanged by the
CRLF fix (a `split('\n')` → `split(/\r\n|\n/)` one-liner in `parseMilestones`).

## [acceptance]
### Blocking
None.
### Advisory
- `build-snapshot.ts:97` — snapshot key order (`cards → milestones → parseErrors`) is correct in code but no test pins full key order; immaterial to SSE consumers. Cosmetic.
Both ACs trace to real, falsifiable tests (two-milestone deep-equal; mixed-status hand-computed `{done,total}`; missing-card `total`-not-`done`-not-throw; seeded fast-check with independent oracle). No scope creep.

## [design]
### Blocking
None.
### Advisory
None.
Faithful to design: `milestones.ts` pure (no fs/gray-matter, `import type` only); `MilestoneProgress` additive in dependency-free `card-model.ts` (ADR-0005); `readMilestonesRaw` mirrors `readConfig` silent-absent (ADR-0008); `milestones` between `cards`/`parseErrors`. `Pick<CardModel,'id'|'status'>` narrowing clean.

## [security]
### Blocking
None.
### Advisory
None.
ReDoS: all four regexes are fixed, single linear quantifiers, run per-line — no catastrophic backtracking. Path: `join(boardDir,'MILESTONES.md')` fixed filename, operator-controlled dir. No new egress/PII in the snapshot. Totality preserved at the read boundary.

## [simplicity]
### Blocking
None.
### Advisory
None.
Small pure single-pass module matching design verbatim. New types each have a real second use, not speculative. Diff scope matches design's file list; no drive-bys. Deliberate non-reuse of `extractSection` justified. `ANY_HEADING_PATTERN` load-bearing (terminator), proven by the stray-`**Cards:**` test.

## [readability]
### Blocking
None.
### Advisory
- `milestones.ts` — a one-line comment on the `ANY_HEADING_PATTERN` branch explaining any non-milestone heading closes the block. (Addressed in rework `ed03641`.)
Naming, JSDoc-why (incl. the extractSection-avoidance rationale), and consistency with `parse-card.ts`/`build-snapshot.ts` all clean.

## [typescript]
### Blocking
None.
### Advisory
- `milestones.ts` — `headingMatch[1]!` non-null assertion is sound (group 1 mandatory); a comment pinning that invariant prevents a silent regression. (Addressed in rework `ed03641`.)
`import type` discipline correct (module stays fs/gray-matter-free); no `any`/unsafe cast; NodeNext `.js` specifiers; `tsc -b --noEmit` verified clean directly. (Pre-existing, out-of-scope: `CardModel.status` is `string`, so `=== 'done'` has no compile-time exhaustiveness.)
