---
verdict: pass
review_lenses_failed: []
---

# CARD-021 — Review panel

_Full 8-lens panel PASS (after rework #1). design/functionality/security independently re-confirmed the ADR-0008 totality fix (per-card readdir now inside the try); tests re-verified all 3 assertion-strength fixes + the chmod-000 regression by mutation. All lenses clean, advisories only._

## [acceptance]
### Blocking
None. All three acceptance criteria trace to falsifiable tests (AC-1 shape incl. `not.toHaveProperty('milestones')` + pinned ISO clock; AC-2 wipLimit read pins literal 5 and the 0-vs-default boundary; AC-3 malformed→parseErrors with exact board-relative path, others parse, reinforced by the re-walk regression + fast-check accounting invariant). Scope clean both directions; deviations documented and justified.
### Advisory
- `build-snapshot.test.ts:107,115,123` — default-branch wipLimit tests assert `toBe(DEFAULT_WIP_LIMIT)` against the imported constant, so no test pins the literal default value `3`. Low consequence (read path + 0-boundary independently pinned). Consider `expect(DEFAULT_WIP_LIMIT).toBe(3)`.
- `build-snapshot.ts:60,73` — no single test exercises a malformed config.md AND a malformed card.md together, so the config-first parseErrors ordering is unproven. Marginal (ordering not itself an AC).


## [design]

### Blocking
None. Prior blocking finding (per-card `readdirSync(cardDir)` outside the try, breaking ADR-0008 totality) is genuinely resolved:
- `src/server/build-snapshot.ts:58-65` — the `readdirSync(cardDir)`, the `if (!entries.includes('card.md')) continue` guard, `readFileSync(card.md)`, and `parseCard(...)` are all now inside the per-card `try`; any failure routes to `parseErrors` as `{ path: '<dirName>/card.md', error }`. Every fs call in the walk traced: `readConfig` guards both its `readFileSync` (absent config → silent default) and `matter()` (malformed → parseErrors); the per-card block is fully guarded. The only unguarded call is `readdirSync(options.boardDir)` at :51 — precisely the one uncaught case ADR-0008 sanctions (missing board *directory*, owned by REQ-014 startup validation). Totality invariant restored.

### Advisory
- `src/server/build-snapshot.ts:19-22` — `clearMatterCache()` is a caller-side workaround for a concern that lives in `parse-card.ts`, the module that owns the `matter()` call. Same advisory raised at first review; deferred as out-of-scope → keep advisory, do not rework. Route to KNOWLEDGE for parse-card follow-up.

### Checked clean
- Dependency arrows: build-snapshot.ts imports only stdlib + gray-matter + parse-card + type-only card-model; no reverse imports; card-model.ts imports nothing.
- Placement: the three JSON-contract types sit in dependency-free card-model.ts per KNOWLEDGE [CARD-020]; walk/config-read/assembly in build-snapshot.ts — right homes.
- fs-in-domain and sync fs ratified by ADR-0008 + the design gate (PR #29) — not re-litigated.
- Extensibility: BoardSnapshot has no `milestones` key; CARD-022 extends it additively — clean seam.

## [functionality]

### Blocking
None. The rework #1 totality fix genuinely holds.

**Totality re-verification (prior finding A).** Every fs call traced against ADR-0008:
- `readConfig` (build-snapshot.ts:36-49): `readFileSync(config.md)` in its own try/catch (→ silent default); `clearMatterCache()` + `matter(raw)` in a second try/catch (→ parseErrors + default). Neither escapes.
- Per-card loop (build-snapshot.ts:63-72): `readdirSync(cardDir)` (:65), the `entries.includes('card.md')` guard (:66), `readFileSync(card.md)` (:67), `clearMatterCache()` (:68), and `parseCard(...)` (:69) are all now inside the per-card try, catch routing to parseErrors. Closes both the EACCES and TOCTOU-ENOENT cases. The `continue` on :66 is inside the try — legal, yields no parseError for a card-less dir.
- The one remaining uncaught fs call is `readdirSync(options.boardDir)` at :58 — not a regression, not in scope: the missing-board-directory precondition ADR-0008 assigns to REQ-014 startup validation.

The chmod-000 regression test (test.ts:268-287) is a true guard: `expect(...).not.toThrow()` + asserts the locked dir lands in parseErrors with the good card still parsing; fails RED against the pre-fix code.

**Acceptance criteria traced with real values:** AC-1 return shape exactly `{generatedAt, projectName, config, cards, parseErrors}`, no `milestones` (seam pinned); AC-2 asWipLimit branches (2→2, absent→3, "three"→3, 0→0, negative→3, NaN/Infinity→3) all asserted; AC-3 malformed→parseErrors with board-relative path + no-leak check + fast-check accounting invariant; determinism via `.sort()` on dirNames + config-first parseErrors ordering.

### Advisory
- `build-snapshot.ts:38-40` — readConfig's first catch treats an unreadable (EACCES) config.md identically to an absent one (silent default), whereas a malformed one routes to parseErrors. An I/O-unreadable config is arguably the malformed case (operator visibility). Low consequence, never throws; not required for this rework.
- `build-snapshot.ts:71` — the per-card catch always attributes the error to `${dirName}/card.md` even when the failure was the `readdirSync(cardDir)` itself (chmod-000 case, where card.md was never reached). Slight misnomer but stays board-relative and non-empty, satisfying AC-3; harmless.

### Notable good
The two cache-isolation tests (test.ts:200-236) are unusually careful: the second omits config.md so readConfig's clearMatterCache() never runs, isolating the per-card loop's own guard — catching a real gray-matter heal-on-re-walk gap a byte-identical-input test would mask.

## [security]

Re-run after rework #1. The totality fix genuinely holds; no blocking findings.

### Blocking
None.

### Advisory
- `src/server/build-snapshot.ts:57` — the top-level `readdirSync(options.boardDir)` remains outside any try/catch, so a vanished/unreadable board *root* mid-flight still throws uncaught. NOT a defect: ADR-0008 and design.md:35-37 carve the board-dir precondition out to REQ-014 startup validation as "the one uncaught case." Untrusted board *contents* are fully guarded. Noted so a future reviewer doesn't re-flag it.
- Prior advisories (unbounded readFileSync/YAML-parse resource exhaustion; symlink following via readFileSync on card-dir contents) stand as previously routed to KNOWLEDGE for later fs-reading cards — low severity, not raised here.

### Checked clean
- **Prior blocker resolved.** build-snapshot.ts:65-73 — the per-card readdirSync(cardDir) and the card.md-presence guard are now inside the per-card try; any EACCES/TOCTOU-ENOENT on a CARD-* dir routes to parseErrors `{path, error}` instead of crashing the long-lived server. The chmod 0o000 regression test (test.ts:268-287) asserts not.toThrow and the locked dir landing in parseErrors; RED pre-fix, GREEN post-fix (168ddbf).
- **Path traversal.** dirName is a single component from readdirSync filtered `startsWith('CARD-')`; no `/` or `..` escape in path.join(boardDir, dirName); parseError.path board-relative, verified not to leak boardDir.
- **Input bounding.** asWipLimit constrains wip_limit to a finite non-negative number; no injection sink (display data).
- **Boundary sweep.** No SQL, no outbound HTTP, no secrets, no new dependencies. tsconfig.test.json adds only an include entry. The `matter as unknown as {...}` cast is a typing narrowing, not a trust boundary.

Notable good: the clearMatterCache() guard closes a real correctness-under-repeat gap (gray-matter cache poisoning) for the SSE re-parse loop.

## [simplicity]
### Blocking
(none)
### Advisory
- `build-snapshot.ts:31-33` (`asWipLimit`) reimplements `parse-card.ts:18-20`'s `asNonNegInt` predicate verbatim (differs only in fallback: 0 vs DEFAULT_WIP_LIMIT), in a file that already imports parse-card.ts. Fix: export `asNonNegInt(value, fallback = 0)` from parse-card.ts and call `asNonNegInt(data.wip_limit, DEFAULT_WIP_LIMIT)` from readConfig; delete asWipLimit.
- `build-snapshot.ts:44-45` (`readConfig`'s own `matter(raw)` call) reaches for clearMatterCache() even though this call site is fully in the file's control. Verified against gray-matter source: passing ANY options object (even `{}`) skips gray-matter's cache path entirely (no read, no write), producing identical output and re-throwing correctly on repeated malformed input. Change line 45 to `matter(raw, {})` and drop the clearMatterCache() at line 44. (The loop's call at line 69 guarding parseCard's internal out-of-scope matter(raw) still needs the cast-based helper — it can't take an injected options object — so clearMatterCache stays with one fewer caller.)
### Notable good
readConfig/buildSnapshot control flow is already the "boring version" — guard clauses, plain filter/map/sort/loop, no premature abstraction. The clearMatterCache JSDoc names the exact upstream behavior it works around.

## [tests]
### Blocking
None. Re-verified all 3 prior gaps by mutation (reverting each after confirming the intended test, and only it, failed):
- `build-snapshot.test.ts:220-236` (cache-guard isolation) — removing only the loop's `clearMatterCache()` (build-snapshot.ts:69) fails this test alone; `readConfig`'s own call (:44) left untouched. Genuinely isolates the loop's guard.
- `build-snapshot.test.ts:333-347` (CARD-* prefix exclusion) — dropping `.startsWith('CARD-')` (:58) fails this test alone (`cards.length` 2 vs 1).
- `build-snapshot.test.ts:114-123` (DEFAULT_WIP_LIMIT pin) — changing the constant (:23) to `7` fails the added `toBe(3)` literal.
- `build-snapshot.test.ts:268-287` (chmod-000 totality) — reverting rework #1's fix (readdir+guard back outside the try) makes this test fail with the real thrown EACCES, confirming `expect(...).not.toThrow()` is load-bearing, not vacuous.

### Advisory
- `build-snapshot.test.ts:358-403` — the new REQ-033 fast-check property test passes only `{ numRuns: 50 }`, no `seed`, unlike the sibling `parse-card.test.ts` (`{ seed: 20260718, numRuns: 200 }`), the repo's stated "fixed seed" convention. Low risk (the invariant should hold for any seed given correct code), but drops reproducibility/consistency. Fix: add `seed: 20260718` alongside `numRuns`.

**Notable good:** the two-malformed-dirs test uses deliberately distinct malformed content per fixture with an inline comment explaining why (gray-matter's parse cache is keyed by exact input string, so two byte-identical malformed inputs would only throw once) — mechanism-aware fixture design that heads off a subtle false-negative.

## [typescript]
### Blocking
(none)
### Advisory
(none)
**Checked clean:** clearMatterCache() cast `(matter as unknown as { clearCache: () => void })` is as narrow as gray-matter's .d.ts gap allows (namespace exports only stringify/read/test/language; index.js:224-226 defines cache/clearCache at runtime) — no any, routed through unknown, consistent with parse-card.ts's narrow-cast style. asWipLimit/errorMessage take unknown and narrow explicitly. No stray any/!/loose as elsewhere. BoardConfig/ParseError/BoardSnapshot match design Interfaces; tsc -b clean on server+test tsconfigs. `const cards = []` uses evolving-array inference (style nit vs sibling `parseErrors: ParseError[]`, not filed — TS2322 still fires on wrong push at the return site). Good: the one unsafe-looking cast isolated in a single named helper.


## [readability]
### Blocking
(none)
### Advisory
- `build-snapshot.ts:62` — `const cards = [];` has no type annotation, inconsistent with `parseErrors: ParseError[] = []` two lines above and parse-card.ts's `const bodyLines: string[] = []`. Relies on TS evolving-array inference. Fix: `const cards: CardModel[] = [];`.
- `card-model.ts:61-67` and `build-snapshot.ts:25-29` — design.md's Interfaces section carries per-field comments (parseErrors ordering; `now` injectable clock; and most valuably `// CARD-022 adds milestones: Milestone[] here additively — not this card` on BoardSnapshot) that were dropped from the shipped bare interfaces. CARD-022 extends this exact interface next; restore at least the milestones-seam note and the boardDir/now clarifications.
### Notable good
clearMatterCache()'s doc comment (build-snapshot.ts:10-16) is exactly the WHY comment wanted — explains the cache-poisoning mechanism, its REQ-008 consequence, and why a narrow cast beats any. Naming (asWipLimit, errorMessage, readConfig) mirrors parse-card.ts conventions.

