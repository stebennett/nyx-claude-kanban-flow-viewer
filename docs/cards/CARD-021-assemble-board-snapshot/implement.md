# CARD-021 — Assemble a board snapshot from cards, config and parse errors — Implement

## What changed
- Added `BoardConfig`, `ParseError`, `BoardSnapshot` types to `src/server/card-model.ts`.
- Added `src/server/build-snapshot.ts`: `buildSnapshot(options)` — reads `config.md` (guarded), lists +
  sorts `CARD-*` dirs, does a single `readdirSync` per card dir, reads `card.md`, and calls
  `parseCard(raw, { dirName, entries })`, wrapped in try/catch routing failures to `parseErrors`.
  `DEFAULT_WIP_LIMIT = 3`; `asWipLimit` coerces `wip_limit` (numeric passthrough incl. 0, else default);
  `readConfig` distinguishes an absent `config.md` (silent default) from a malformed one (routes to
  `parseErrors` + default); a `CARD-*` dir with no `card.md` is skipped (not an error);
  `clearMatterCache()` guards every `matter()`-consuming call against gray-matter's cache-poisoning bug.
- Added `src/server/build-snapshot.test.ts`: `writeFixtureBoard` helper (real temp dirs, no mocks) +
  tests covering AC-1/2/3, determinism, edge cases, and a fast-check property test over the REQ-033
  cards/parseErrors accounting invariant.
- Registered `build-snapshot.ts` in `tsconfig.test.json`'s `include` (TS6307 trap, KNOWLEDGE [CARD-019]).

## Deviations from design
- **gray-matter cache-poisoning fix (new, not in the design's task list).** `matter()` caches parses
  keyed by the exact input string and populates that cache entry BEFORE parsing — so a parse that then
  throws leaves a poisoned (empty-data) cache entry. Since `buildSnapshot` runs repeatedly in the same
  long-lived process (REQ-008 debounced re-parse), an unchanged persistently-malformed `card.md` would
  parseError on the first walk but silently "heal" with empty defaults on later walks — a real gap
  against ADR-0008/REQ-033. Fixed in-file via a local `clearMatterCache()` helper called before every
  `matter()`-consuming call, with a regression test. `parse-card.ts` (out of scope) left untouched.
- Tasks 7 and 9 passed immediately (recorded, not silently skipped).
- **(Rework #1)** Changed-lines total (incl. tests, per config.md's size_limit definition) is now ~507,
  7 over the 500 cap. `DLV-SIZE` is advisory (not blocking) and this is a rework on an implemented card —
  not something to split retroactively (precedent: KNOWLEDGE [CARD-019]'s "we never split a split").
  Flagged for the deliver-checker rather than silently absorbed.

## Rework #1 — review panel findings addressed

**A. Totality bug (design + functionality + security lenses).** The per-card `readdirSync(cardDir)` sat
OUTSIDE the per-card try/catch, so a `CARD-*` dir listed in `boardDir` but itself unreadable (EACCES, or
a TOCTOU ENOENT removed mid-walk under CARD-007's debounced re-parse) threw uncaught out of
`buildSnapshot`, violating ADR-0008. Fixed by moving the `readdirSync(cardDir)` call and the
`card.md`-presence guard (`if (!entries.includes('card.md')) continue`) inside the per-card `try`, so any
failure routes to `parseErrors` as `{ path: '<dirName>/card.md', error: errorMessage(err) }`.
- TDD: added a `chmod 000` regression test — confirmed RED (`expected [Function] to not throw … EACCES`)
  against the pre-fix code, GREEN after the move. Commit `168ddbf`.

**B. Test-strength gaps (tests lens), all mutation-verified before being kept:**
1. Cache-poisoning regression variant with `config.md` OMITTED, so the per-card loop's own
   `clearMatterCache()` is the SOLE guard under test (previously masked by `readConfig`'s call).
   Verified: removing the loop's call now fails this new test.
2. A `misc-notes/card.md`-containing, non-`CARD-*`-prefixed directory asserted excluded. Verified:
   removing `.startsWith('CARD-')` now fails this test (`cards.length` 2 vs 1).
3. Pinned the literal `3` (`expect(snap.config.wipLimit).toBe(3)`) alongside the `DEFAULT_WIP_LIMIT`
   symbol assertion. Verified: changing `DEFAULT_WIP_LIMIT` to `7` now fails.
Commit `8ac4816`.

Advisory items (negative `wip_limit` test, `matter(raw, {})` simplification, `asNonNegInt` dedup) not
applied — none required to clear the rework, and two touch `parse-card.ts` (out of scope).

## Gates run (post-rework)
- `npm run lint` — clean. `npm run typecheck` (`tsc -b --noEmit`) — clean.
- `npm test -- --coverage` — 75 tests pass (was 72; +3: unreadable-dir, cache-isolation, non-CARD-prefix);
  coverage 100% stmts/funcs/lines, 98.61% branch (build-snapshot.ts 100/95.45 — the one uncovered branch
  is the documented `errorMessage` dead branch).
- `npm run build` — clean. `package-lock.json` unchanged; rollup entries still 25.

## Commits
- `dc94160` … `772b229` (original 9 TDD commits)
- `168ddbf` fix(server): move per-card readdir inside try, so an unreadable card dir routes to parseErrors — rework #1, finding A
- `8ac4816` test(server): strengthen three mutation-verified assertion gaps in build-snapshot — rework #1, finding B
