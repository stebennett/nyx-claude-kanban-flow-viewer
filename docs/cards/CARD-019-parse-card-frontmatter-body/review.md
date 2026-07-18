---
verdict: pass
review_lenses_failed: []
---

# CARD-019 — Review panel (complete — 8 lenses, pass)

The first full run stamped **fail**: the tests lens found a designed `asDateString` branch that executed
but was never asserted (a mutation blanking every quoted date survived all 18 tests, masked by 100%
branch coverage). card-implementer reworked it (added the 3 date assertions + 4 coercion edge-case tests,
commit 4544f70), and the tests lens re-reviewed the reworked code and independently confirmed the gap
closed (re-ran the mutation → RED → revert → GREEN) with nothing weakened. All eight sections below now
pass. Verdict: **pass**, panel complete.

## [acceptance]
### Blocking
None.
### Advisory
- AC-4 (no BOARD.md) is enforced by construction (no fs import); no negative test, acceptable per design.
- Branch is ~541 lines > 500 `size_limit` (test-file driven); a split-sub-step concern, no test cut to fit.
### Checked
All 5 ACs trace to non-vacuous tests. AC-2 heading-scoping verified: stray `- [x]` in `## Why` and
`## Notes`, mutation to unscoped yields `{done:4,total:7}` vs asserted `{done:2,total:5}`.

## [design]
### Blocking
None.
### Advisory
- `parse-card.ts` `extractSection` interpolates its `heading` arg unescaped into a `RegExp` — safe for
  the current literal callers ('Why'/'Notes'/'Acceptance criteria'), a latent trap for a future
  computed-heading caller. Escape or literal-match to close it.
### Checked
Additivity for CARD-020 holds (`parseCard(raw, options)`, no external callers yet). Model shape matches
ADR-0005 (string-typed status, explicit map, optional blocker, Date→YYYY-MM-DD). The cross-card
`test/packaging.test.ts` edit is correct, ADR-0005-sanctioned, and in-scope.

## [functionality]
### Blocking
None.
### Advisory
- `parse-card.ts` `matter(raw)` throws (unhandled `YAMLException`) on malformed frontmatter — **by
  design**; the `parseErrors` tray (REQ-033) is CARD-005's job. **Contract for CARD-005: wrap each
  `parseCard` in try/catch.** No-frontmatter degrades to defaults (no throw).
- `asDateString` shifts the calendar day for a YAML timestamp with a time+offset (harmless for the
  date-only strings /kanban writes).
- `countCriteria` counts a `- [x]` inside a fenced code block (matches design's line-regex spec).
- `asNonNegInt`/`asNumberOrNull` name-vs-behaviour nit (don't enforce integer/non-negative) — harmless
  for /kanban's values.
### Checked
All 5 ACs trace to a code path and a non-vacuous test; edge cases probed live.

## [security]
### Blocking
None.
### Advisory
- `parse-card.ts` `matter(raw)` throws on hostile/malformed YAML — CARD-005's tray must contain it
  (same as functionality's finding).
### Checked (verified live)
gray-matter uses `safeLoad` (rejects `!!js/function`); js-yaml 3.15.0 blocks global prototype pollution
and `parseCard` never spreads `data` (explicit named reads only — a load-bearing defense); regexes are
linear (no ReDoS); `gray-matter@4.0.3` pinned + sha512 integrity, `npm audit --omit=dev` clean; parser
is pure (no fs/net/exec).

## [simplicity]
### Blocking
None.
### Advisory
- The 7 test fixtures each redeclare `id/title/status` boilerplate to vary one field; a
  `minimalCard(overrides)` builder (or `it.each` for the blocker tri-state) would fold ~60-80 lines.
  Non-blocking; each fixture is correct and traces to a design.md Test-strategy bullet.
### Checked
Field map + 7 coercion helpers are proportionate, faithful to ADR-0005's explicit-map decision; no
speculative abstraction; the 541-vs-500 overage traces 1:1 to the Test strategy, not padding.

## [tests]
Re-reviewed after rework. Prior BLOCKING finding resolved and independently re-verified.
### Blocking
None. Mutated `parse-card.ts:36` (`asDateString` string branch `return value;` → `return '';`), ran
`vitest run src/server/parse-card.test.ts` → the full-fields test failed (`expected '' to be
'2026-07-01'`, 21 pass / 1 fail); reverted → 22/22 green. The gap is closed and asserted.
### Advisory
None new. The 4 folded-in coercion edge-case tests were each independently mutation-tested and confirmed
non-vacuous (`asStringArray` filter, `asNonNegInt` guard, `asNumberOrNull` clamp). Rework commit 4544f70
is pure test additions (60 insertions / 0 deletions) — no production code or existing assertion touched.
### Checked
Full suite 34/34; 100% coverage on `parse-card.ts` re-confirmed. The rework's implement.md mutation proof
reproduced verbatim.

## [readability]
### Blocking
None.
### Advisory
- `card-model.ts` presents 24 fields as a flat block; design.md's six visual groups (identity / relations
  / PR-state / effort / body-derived / timestamps) aren't preserved — blank lines or group labels would
  restore legibility.
- `UNCHECKED_CHECKBOX_PATTERN` feeds a `notDone` local (naming asymmetry with the consistent `done` side)
  — rename to `unchecked`.
### Checked
Coercion helpers self-documenting; the two non-obvious gotchas (Date coercion, `###` non-termination)
carry why-comments; the snake→camel map is one flat ordered literal a reader aligns by eye.


## [typescript]
### Blocking
None.
### Advisory
None.
### Checked
Every `data` field goes through a runtime-checked `unknown`→typed coercion helper; the one `as` cast
(`asReworks`) is guarded by a `typeof === 'object' && !== null` check. `noUncheckedIndexedAccess` honoured
(for-of over a slice, no unguarded indexing). `verbatimModuleSyntax`: `import type` for the interfaces,
default import of gray-matter correct for its `export =` + `esModuleInterop`. `.js` extensions present.
`blocker?` modelled correctly. Re-ran `tsc -b --noEmit` + lint — both green.
