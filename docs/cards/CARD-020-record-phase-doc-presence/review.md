---
verdict: pass
review_lenses_failed: []
---
# CARD-020 — Review (full 8-lens panel)

**Verdict: pass.** All eight lenses clean, no blocking findings. Several lenses independently
mutation-tested or re-ran the gates rather than trusting `implement.md`/`test.md`. Advisories ride the
PR (none rework-worthy).

## [acceptance]
### Blocking
(none)
### Advisory
(none)
Both ACs trace to falsifiable tests. Independently mutation-tested: stubbing `hasCheckDoc` to always-true
→ 8 tests fail; dropping the `entries` wiring in `parseCard` → 2 tests fail incl. the AC-2 purity
assertion. Presence-only holds structurally (`grep` for fs/readFile/readdir in `parse-card.ts`/`card-model.ts`
returns nothing). Scope matches design.md exactly; "Deviations from design: None" verified.

## [design]
### Blocking
(none)
### Advisory
(none)
Diff matches design.md's Interfaces/Approach 1:1: additive `phaseDocsPresent`, `PHASE_NAMES`/types in the
dependency-free `card-model.ts`, `derivePhaseDocsPresent`/`hasCheckDoc` in `parse-card.ts`, no new module.
`parseCard` keeps its arity; `entries?` is the additive `ParseCardOptions` field ADR-0005 named. Explicit
per-key construction; plain-string matching (no `extractSection`/RegExp). The one live risk (PHASE_NAMES
placement vs CARD-011's UI boundary) is the already-tracked, accepted forward risk from design-check.

## [functionality]
### Blocking
(none)
### Advisory
(none)
Traced `derivePhaseDocsPresent`/`hasCheckDoc` by hand against the spec — exact match. Verified exact-vs-prefix
independence (`deliver-check.md` → `.check` true, `.phase` false), `entries` undefined-vs-empty both all-false,
the `.md` guard rejects `.txt`, and **all six phase names checked pairwise for `-check-` prefix/substring
collisions — none** (cross-checked against real `deliver-check-design.md` filenames on disk). Independently
re-ran `tsc -b --noEmit` (clean) and `vitest` (36/36).

## [security]
### Blocking
(none)
### Advisory
(none)
Purity confirmed (no `fs`/`path`/`child_process` import; `dirName` stored, never read). Prototype-pollution-safe:
`entries` become `Set` membership tests only; the record is built with six explicit literal keys, never a
dynamic key from untrusted filenames — no `__proto__`/`constructor` path. ReDoS-safe: `Set.has`/`startsWith`/
`endsWith` only, no RegExp; the CARD-019 `extractSection` trap is untouched and not engaged.

## [simplicity]
### Blocking
(none)
### Advisory
(none)
Clean, minimal, purely-additive diff (~44 code lines). Public surface exported only where a named future caller
exists (CARD-011/018, or the design's test-isolation requirement); `hasCheckDoc` correctly stays private. No
scope creep; no reimplementation of existing helpers. Explicit per-key construction correctly not flagged (a
loop would be a `noUncheckedIndexedAccess` regression).

## [tests]
### Blocking
(none) — every `hasCheckDoc` branch and the phase/check field distinction has a fixture that goes RED under the
corresponding mutation (empirically applied four mutations, re-ran the suite, restored clean). AC-2 purity doubly
proven (nonexistent-`dirName` test AND no `fs` import). Unit expectations are hand-typed literals, not formulas.
### Advisory
- `parse-card.test.ts:451-457` — the "empty `[]`" vs "undefined" test pair asserts the identical `ALL_FALSE`
  and is claimed (design.md/test.md) to cover the `?? []` branch "distinct from `[]`". **Verified inert:** replacing
  `new Set(entries ?? [])` with `new Set(entries)` leaves all 36 tests green (`new Set(undefined)` is already
  empty). The `??` fallback is not mutation-provable by this pair (the two call shapes are still worth keeping as
  API-surface tests). Housekeeping: drop the "distinct branch" claim.
- `parse-card.test.ts:500-525` — the property test's `check`-field expected value is a character-for-character
  duplicate of `hasCheckDoc`'s expression rather than an independently-derived invariant. Empirically not inert
  (typed separately, not a call-through — an exact-match-removal mutation fails it in isolation), but shares a
  provenance risk: a shared authoring error in the design's prescribed formula would embed in both. Prefer
  CARD-019's `countCriteria` tag-based ground-truth style on the next touch.

## [readability]
### Blocking
(none)
### Advisory
- `card-model.ts:18` — `PhaseDocPresence.phase: boolean` (doc-exists flag) sits ~10 lines from
  `CardModel.phase: string` (current flow phase); a reader of `model.phaseDocsPresent.design.phase` can misread
  it. Renaming the sibling-of-`check` field to `doc` (`{ doc, check }`) would remove the overload and read more
  symmetrically. (Design sanctioned `phase`; captured for CARD-011 in KNOWLEDGE.)
- `card-model.ts:14` — `PHASE_NAMES` carries no inline comment that its order is load-bearing (REQ-025's
  reverse-scan column inference). One line ("flow order — REQ-025 consumers scan in reverse") would make the
  invariant visible in the owning file. (KNOWLEDGE already records it.)

## [typescript]
### Blocking
(none)
### Advisory
- `parse-card.ts:101-104` — `hasCheckDoc` re-spreads the same `Set` into a fresh array (`[...names]`) on each of
  the 6 per-card calls. Trivial at this scale; hoisting `const namesArray = [...names]` once would avoid the
  repeat allocation on a larger listing.
Independently re-ran `tsc -b --noEmit` (green). `PHASE_NAMES as const` → `PhaseName`, total mapped type
`PhaseDocsPresent` is compiler-enforced complete (the explicit 6-key literal checked both ways), no `any`/`!`/unsafe
cast, `entries` stays `readonly`, and the `import type`/value split is correct for `verbatimModuleSyntax`/NodeNext.

## Panel outcome
8/8 pass, `review_lenses_failed: []`. No blocking findings → measure branch size for the split sub-step.
