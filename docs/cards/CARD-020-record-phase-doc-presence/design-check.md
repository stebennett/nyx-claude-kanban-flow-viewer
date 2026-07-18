---
verdict: pass
criteria: {DSG-AC-COVERED: pass, DSG-SPEC-FIDELITY: pass, DSG-TASK-TDD: pass, DSG-DOCTRINE: pass, DSG-ADR-NEEDED: pass, DSG-KNOWLEDGE: pass, DSG-SCOPE: pass, DSG-NO-CODE: pass}
---
## Verdict
**pass** — no blocking finding. The design is a faithful, minimal, additive extension of the CARD-019
parser: it covers both ACs with non-vacuous independently-computed tests, keeps `parseCard` pure
(readdir stays in the CARD-005 caller), correctly grounds "no new ADR" in ADR-0005's explicit
forward-extension text, and sidesteps every named doctrine/KNOWLEDGE trap. One advisory rides the PR
about the PHASE_NAMES location vs the server/UI boundary for CARD-011.

## Criteria
| id | verdict | evidence |
|---|---|---|
| DSG-AC-COVERED | pass | AC-1 (per-phase phase+check presence, contents never read) → `phaseDocsPresent`/`PhaseDocPresence`/`derivePhaseDocsPresent`, tested in tasks 1 & 3 (design.md:80-101) with hand-enumerated booleans (design.md:109). AC-2 (scan rides caller's read; parseCard no fs) → `entries?` option + purity test `parseCard(FIXTURE,{dirName:'/does/not/exist',entries:['deliver.md']}).phaseDocsPresent.deliver.phase===true` (design.md:100). Both ACs map to ≥1 task; both tests non-vacuous. |
| DSG-SPEC-FIDELITY | pass | Every citation verified against files: REQ-025 (spec.md:191-197, exact), REQ-020 (spec.md:155-162), REQ-002 (spec.md:31), REQ-033 (spec.md:255), REQ-016 (spec.md:123), ADR-0005 (0005-*.md:20-21,32-34). Design contradicts none: purity upholds REQ-002/033; field serialized verbatim per REQ-016; REQ-025 column-inference uses `.phase` (design.md:70-71). REQ-020's literal field list omits phaseDocsPresent, but ADR-0005 forward-extends the model and REQ-025 requires the scan — consistent, not contradictory. |
| DSG-TASK-TDD | pass | Tasks 1-3 each are Test→run red→Implement→run green→Commit (design.md:80-102), file-level (parse-card.test.ts, card-model.ts, parse-card.ts). Test precedes the code it drives in every task. Task 4 is gate verification. |
| DSG-DOCTRINE | pass | See ## Doctrine — spec-outranks (cited throughout), parallel-derived (`.phase` vs `.check` named + consumer named, design.md:70-71), determinism (fast-check fixed seed/numRuns 200, no network, string fixtures — design.md:91) honoured; numeric-precision and as-of semantics do not apply (booleans only, no per-record snapshots). |
| DSG-ADR-NEEDED | pass | No ADR proposed. Verified ADR-0005 Context ("forward-extensible (CARD-020 adds `phaseDocsPresent`)", 0005:20-21) and Decision ("options object so CARD-020 adds `entries` additively", 0005:32-34) genuinely anticipate BOTH additions — the design's claim (design.md:124-125,128-131) is accurate, so "no new ADR" is well-founded. The only local choice (PHASE_NAMES location) is a constant placement, trivially reversible → KNOWLEDGE, not ADR. No proposal duplicates/contradicts a standing ADR. |
| DSG-KNOWLEDGE | pass | Named traps all avoided: TS6307 new-module trap — no new module; verified both card-model.ts and parse-card.ts already in tsconfig.test.json include (lines 15-16), so design.md:105 "no tsconfig.test.json change" is correct. noUncheckedIndexedAccess dead-branch — explicit per-key construction, no indexed access (design.md:48-49,67). coverage%≠asserted — per-branch asserted fixtures + explicit mutation checks (design.md:110-117). extractSection unescaped-RegExp — design does filename matching via plain string methods (has/startsWith/endsWith), never RegExp/extractSection, so the predicted CARD-020 computed-heading trap does not materialise. Advisory: PHASE_NAMES placed in card-model.ts vs [CARD-004]'s "in the parser" — see ## Advisory findings. |
| DSG-SCOPE | pass | In/out-of-scope explicit (design.md:20-31). Out-of-scope honestly excludes readdir/board walk (CARD-005), column/blocked rendering (CARD-011), serving docs (CARD-018), frontmatter/body & parseErrors (CARD-019/005). Every task maps to AC-1, AC-2, or gate verification; no task implements readdir or column selection. Recording `.check` presence is AC-1-mandated, not creep. |
| DSG-NO-CODE | pass | Design branch is docs-only — git status clean at dispatch; all TypeScript appears only as fenced sketches (design.md:53-68) and as task descriptions, no .ts file written. |

## Acceptance criteria → tasks
Independent expectation (derived from card.md before reading the design's list): (1) types+PHASE_NAMES in card-model.ts, no fs; (2) pure `derivePhaseDocsPresent` in parse-card.ts, red→green, fixtures for present/subset/check-variants/exact-vs-check/.md-guard/noise; (3) wire `entries?` + field into parseCard, test pass-through + purity; (4) gate verification. The design's list matches this one-to-one.
- **AC-1** (records per-phase phase-doc + check-doc presence, contents never read) → Task 1 (derive + types, 8 asserted fixtures), Task 2 (membership property), Task 3 (parseCard integration). Covered, non-vacuous.
- **AC-2** (scan rides caller's read; parseCard no fs) → Task 3 AC-2 purity assertion (design.md:100) + mutation check "drop entries wiring → purity test fails" (design.md:117). Covered, non-vacuous.
- Task → criterion (reverse): Task 1/2/3 → AC-1/AC-2; Task 4 → gate verification (standard, not scope creep). No orphan task serving no criterion.

## Doctrine
- **Spec outranks training** — applies; honoured: each decision cites REQ-025/020/002/033/016 or ADR-0005, not memory (design.md:120-125).
- **Numeric precision** — does not apply: the field is booleans; no money/decimal/rounding value present.
- **Parallel derived values** — applies (two related booleans `.phase` and `.check`); honoured: the design names each and states which one each consumer gets — REQ-025 column inference reads `.phase` only (design.md:70-71).
- **As-of semantics** — does not apply: no per-record dated snapshots or reference-data replay in this scan.
- **Determinism** — applies to tests; honoured: fast-check `seed` fixed + `numRuns:200`, no network, pure in-memory string fixtures (design.md:91,107-109).

## Blocking findings
None.

## Advisory findings
- **DSG-KNOWLEDGE / PHASE_NAMES placement (design.md:130).** PHASE_NAMES lives in card-model.ts
  (src/server), whereas KNOWLEDGE [CARD-004] records the canonical filename set as "defined once in
  the parser" (parse-card.ts). The design defines it once and reuses it — the convention's intent is
  met — and openly flags the deviation. Two forward risks, neither blocking CARD-020's ACs: the
  [CARD-004] convention wording drifts from reality, and CARD-011 (a UI-layer card) reusing
  PHASE_NAMES for column inference (design.md:29,70-71) would import a server-side module across the
  load-bearing src/server↔src/ui project boundary (KNOWLEDGE [CARD-001]). Remedy: forewarn CARD-011
  that "reuse PHASE_NAMES" may require a UI-reachable home or an accepted UI re-declaration of flow
  order, and refresh the [CARD-004] KNOWLEDGE wording to match the card-model.ts placement.
