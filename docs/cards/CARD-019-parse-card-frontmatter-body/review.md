---
verdict: fail
review_lenses_failed: [tests]
---

# CARD-019 — Review panel (full run, 8 lenses)

Seven lenses pass; the **tests** lens carries one blocking finding (a designed `asDateString` branch
executes but is never asserted — a mutation blanking every quoted date survives all 18 tests, masked by
100% branch coverage). Verdict: **fail** → rework to card-implementer (fix the test assertion). The
seven passing lenses' advisories ride the PR.

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

## [tests]
### Blocking
- `src/server/parse-card.test.ts:37-57` — the full-fields test sets **quoted** date strings
  (`created: "2026-07-01"`, `started: "2026-07-02"`, `delivered: "2026-07-03"`), which is the ONLY
  fixture in the file that exercises `asDateString`'s **string-passthrough branch** (`parse-card.ts:36`),
  but the test never asserts `model.created`/`started`/`delivered`. design.md's Interfaces section names
  three outcomes for `asDateString` (Date→ISO-slice, string passthrough, else `''`); only two are
  asserted (Date-instance via the date-coercion test, missing-field via the defaults test). **Verified
  live:** mutating `parse-card.ts:36` from `return value;` to `return '';` (silently blanking every
  already-quoted date) left `vitest run` at **18 pass / 0 fail** — a real, undetectable data-loss bug in
  a designed code path that 100% v8 branch coverage does not catch (the branch *executes* without being
  *asserted on*). **Fix:** add to the full-fields test —
  `expect(model.created).toBe('2026-07-01'); expect(model.started).toBe('2026-07-02'); expect(model.delivered).toBe('2026-07-03');`
### Advisory
- `asNonNegInt`/`asNumberOrNull` have no negative/wrong-typed-present fixture; `asStringArray`'s
  non-string-item filter is never exercised by a mixed-type fixture. Given REQ-033 (never crash on one
  card), a `reworks: {slice: -1}` / `split_slices: "two"` / `depends_on: [CARD-001, 123]` case would
  strengthen the robustness proof. Not verified to escape coverage instrumentation, so advisory.
### Checked
Expected values hand-derived (not formula-mirrored); the fast-check property is invariant-based (fixed
seed 20260718, generator-controlled counts); the AC-2 scoping test is genuinely non-vacuous.

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
