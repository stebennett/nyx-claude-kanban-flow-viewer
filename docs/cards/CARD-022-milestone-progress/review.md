---
verdict: pass
review_lenses_failed: []
---
# CARD-022 — Review panel (full, 8 lenses)

Verdict: **pass** — complete and clean. All 8 lenses pass; advisories only. The `functionality` and
`tests` lenses (which found the CRLF blocker on the first pass) re-ran against the reworked branch
(fix `ed03641`, `split(/\r\n|\n/)`) and both confirmed the defect resolved.

## [acceptance]
### Blocking
None.
### Advisory
- `build-snapshot.ts:97` — snapshot key order (`cards → milestones → parseErrors`) correct in code but not pinned by a test; immaterial to SSE consumers. Cosmetic.
Both ACs trace to real, falsifiable tests. No scope creep.

## [design]
### Blocking
None.
### Advisory
None.
Faithful to design: pure `milestones.ts`; `MilestoneProgress` additive in dependency-free `card-model.ts` (ADR-0005); `readMilestonesRaw` mirrors `readConfig` (ADR-0008); `milestones` between `cards`/`parseErrors`.

## [functionality]
### Blocking
None. Prior CRLF blocker fully resolved.
### Advisory
None.
CRLF fix verified correct & complete (`milestones.ts:24`, `split(/\r\n|\n/)`) — hand-traced against a `\r\n` fixture: headings, `**Cards:**` lines, and `\r\n\r\n` separators all handled uniformly; alternation order (`\r\n` before `\n`) correct. Global-regex safety (`CARD_ID_PATTERN` via `.match`, no `lastIndex` bug); `deriveMilestones` never throws; wiring/key-order/determinism all sound. (Lone-CR classic-Mac endings not handled — extinct, not a defect.)

## [security]
### Blocking
None.
### Advisory
None.
No ReDoS (fixed per-line regexes); fixed-filename path join; no new egress/PII; totality preserved at the read boundary.

## [simplicity]
### Blocking
None.
### Advisory
None.
Small pure single-pass module matching design. New types have real second uses. Diff scope matches design's file list. `extractSection` non-reuse justified.

## [tests]
### Blocking
None.
### Advisory
- `milestones.test.ts` — `deriveMilestones` has no explicit empty-`cardIds` → `{done:0, total:0}` case end-to-end (the `total === 0` boundary; `parseMilestones` covers empty `cardIds`, but it isn't carried through `deriveMilestones`). Low risk (trivial on `[]`), not blocking.
CRLF regression test (`milestones.test.ts:70-79`) verified meaningful: hand-traced against the pre-fix `split('\n')` — both its differential and literal deep-equal assertions would fail. Rest of the suite remains mutation-resistant (literal/hand-computed expecteds, independent property oracle, discriminating build-snapshot cases). 105/105 green, 100% on `milestones.ts`.

## [readability]
### Blocking
None.
### Advisory
- `milestones.ts` — comment on the `ANY_HEADING_PATTERN` terminator branch. (Addressed in rework `ed03641`.)
Naming, JSDoc-why, and consistency with `parse-card.ts`/`build-snapshot.ts` all clean.

## [typescript]
### Blocking
None.
### Advisory
- `milestones.ts` — `headingMatch[1]!` invariant comment. (Addressed in rework `ed03641`.)
`import type` discipline correct; no `any`/unsafe cast; NodeNext `.js` specifiers; `tsc -b --noEmit` verified clean. (Pre-existing/out-of-scope: `CardModel.status` is `string`, no compile-time exhaustiveness on `=== 'done'`.)
