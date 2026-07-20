---
verdict: fail
review_lenses_failed: [functionality, tests]
---
# CARD-022 — Review panel (full, 8 lenses)

Verdict: **fail** — `functionality` and `tests` independently found the same blocking defect (CRLF
heading-parse failure). Six lenses clean (advisories only).

## [acceptance]
### Blocking
None.
### Advisory
- `build-snapshot.ts:97` — snapshot key order (`cards → milestones → parseErrors`) is correct in code but no test pins full key order; JSON key order is immaterial to SSE consumers. Cosmetic.
Both ACs trace to real, falsifiable tests (two-milestone deep-equal; mixed-status hand-computed `{done,total}`; missing-card `total`-not-`done`-not-throw; seeded fast-check with independent oracle). No scope creep.

## [design]
### Blocking
None.
### Advisory
None.
Faithful to design: `milestones.ts` pure (no fs/gray-matter, `import type` only); `MilestoneProgress` additive in dependency-free `card-model.ts` (ADR-0005); `readMilestonesRaw` mirrors `readConfig` silent-absent (ADR-0008); `milestones` between `cards`/`parseErrors`. `Pick<CardModel,'id'|'status'>` narrowing clean.

## [functionality]
### Blocking
- `src/server/milestones.ts:8` — `MILESTONE_HEADING_PATTERN = /^##\s+(M\d+.*)$/` with `raw.split('\n')` fails to match ANY heading on a CRLF file: `.` excludes `\r` and JS `$` (no `m`) won't match before `\r`, so every `## M<N> — …` line falls through to `ANY_HEADING_PATTERN` (treated as a terminator, never an opener) → `parseMilestones` returns `[]`, milestones silently vanish (no throw, no parseError). Violates AC-1 for CRLF input; the tool parses arbitrary target repos (git-for-Windows `core.autocrlf=true`). Regresses the codebase's own CRLF-tolerant precedent `extractSection` (`parse-card.ts:59`, `\s*$` absorbs `\r`). **Fix:** split on `/\r\n|\n/` (or heading anchor `(M\d+.*?)\s*$`), and add a CRLF fixture test.
### Advisory
- `milestones.ts:32` — `ANY_HEADING_PATTERN = /^#{1,2}\s/` resets `current` only on `#`/`##`, not `###+`; a `**Cards:**` under a level-3 subheading inside a milestone still attaches. Almost certainly intended (`###` belongs to its milestone); `/refine` uses only `##`. No change needed.

## [security]
### Blocking
None.
### Advisory
None.
ReDoS: all four regexes are fixed, single linear quantifiers, run per-line (split first) — no catastrophic backtracking. Path: `join(boardDir,'MILESTONES.md')` fixed filename, operator-controlled dir. No new egress/PII in the snapshot. Totality preserved at the read boundary.

## [simplicity]
### Blocking
None.
### Advisory
None.
Small pure single-pass module matching design verbatim. New types each have a real second use (consumer + separate tests), not speculative. Diff scope matches design's file list; no drive-bys. Deliberate non-reuse of `extractSection` justified (verified no existing `CARD-\d` regex to reuse). `ANY_HEADING_PATTERN` load-bearing (terminator), proven by the stray-`**Cards:**` test.

## [tests]
### Blocking
- `src/server/milestones.ts:8,24` — same CRLF defect, verified by direct execution: `parseMilestones('## M1 — X\r\n**Cards:** CARD-001…')` → `[]` under CRLF vs 2 milestones under LF. Untested by any of the 11 `milestones.test.ts` / 3 new `build-snapshot.test.ts` cases. **Fix:** split on `/\r\n|\n/` at line 24; add a CRLF fixture asserting parity with the LF fixture.
### Advisory
None.
Verified mutation-resistance empirically: flipping `=== 'done'`→`!==` (5 fail), `total`→only-resolved (4 fail), dropping `current = null` terminator (stray-`**Cards:**` fails) each redden a specific test. Seeded fast-check property derives ground truth from the arbitrary's own `tagDone` tag — non-vacuous ([CARD-020] pattern). Hand-computed literal expecteds.

## [readability]
### Blocking
None.
### Advisory
- `milestones.ts:29-34` — add a one-line comment on the `ANY_HEADING_PATTERN` branch explaining that any non-milestone heading closes the block (the "why" for the terminator lives in design.md/tests, not the code).
Naming, JSDoc-why (incl. the extractSection-avoidance rationale), and consistency with `parse-card.ts`/`build-snapshot.ts` all clean.

## [typescript]
### Blocking
None.
### Advisory
- `milestones.ts:27` — `headingMatch[1]!.trim()` non-null assertion is sound today (group 1 is mandatory), but a comment pinning that invariant would prevent a silent regression if the pattern later makes the group conditional.
`import type` discipline correct (module stays fs/gray-matter-free); no `any`/unsafe cast; NodeNext `.js` specifiers; `tsc -b --noEmit` verified clean directly. (Pre-existing, out-of-scope: `CardModel.status` is `string`, so `=== 'done'` has no compile-time exhaustiveness — a future card could narrow it.)
