---
verdict: pass
criteria: {DSG-AC-COVERED: pass, DSG-SPEC-FIDELITY: pass, DSG-TASK-TDD: pass, DSG-DOCTRINE: pass, DSG-ADR-NEEDED: pass, DSG-KNOWLEDGE: pass, DSG-SCOPE: pass, DSG-NO-CODE: pass}
---
## Verdict
pass — every DSG-* criterion passes; no blocking or citable advisory findings. Independently derived task list before reading the design's; the design maps to it both directions. All five cited spec sections opened and confirmed truthful; doctrine points cross-checked against the real `card-model.ts`, `build-snapshot.ts`, and `parse-card.ts`.

## Criteria
| id | verdict | evidence |
|---|---|---|
| DSG-AC-COVERED | pass | design.md:85-119 — 3 tasks. AC-1 (REQ-004 parse name/cardIds)→task 1; AC-2 (REQ-019 done/total + snapshot wiring)→tasks 2&3. Full 4-field shape = parseMilestones(name/cardIds) ∪ deriveMilestones(done/total) ∪ buildSnapshot wiring. No task without an AC. |
| DSG-SPEC-FIDELITY | pass | design.md:131-135 vs spec: REQ-004@L42 ✓, REQ-019@L141-153 (shape incl. `milestones:[{name,cardIds,done,total}]` and key order cards→milestones→parseErrors, design.md:81) ✓, REQ-031@L233 ✓, status enum@L28 (`done` terminal) ✓, §Testing@L293-294 (milestones parsing) ✓. No contradiction. |
| DSG-TASK-TDD | pass | design.md:86-119 — file-level tasks; each "write failing tests first, then implement, npm test, commit" / "Red→green→commit". Task 3 flips build-snapshot.test.ts:76 `not.toHaveProperty`→`toHaveProperty` as the red-first driver for the wiring. |
| DSG-DOCTRINE | pass | Types in dependency-free card-model.ts (ADR-0005; matches existing BoardSnapshot home) design.md:59-63; no extractSection reuse, confirmed at parse-card.ts:59 (unescaped interpolation + literal-heading contract can't capture M<N>) design.md:51-56; totality mirrors readConfig silent-absent (build-snapshot.ts:35-51), deriveMilestones never throws → ADR-0008 design.md:80,119; `tsc -b --noEmit` design.md:124. Parallel-derived done vs total named distinctly design.md:74. Determinism: seed 20260720, no network/clock design.md:107,128-129. |
| DSG-ADR-NEEDED | pass | design.md:140-144 proposes none. MilestoneProgress applies ADR-0005 additively; done-rule one-line cheap-to-reverse KNOWLEDGE convention (design.md:56 argues split/superseded reversal is cheap). No duplicate/contradiction with ADR-0005/0008 in docs/adrs/README.md. |
| DSG-KNOWLEDGE | pass | design.md:88,107,111,124,138 heed [CARD-019] tsconfig.test include (TS6307), [CARD-021] seed convention, [CARD-020] tag-based property ground truth, [CARD-019→020] extractSection trap, [CARD-001] tsc-b. No recorded gotcha re-tread. |
| DSG-SCOPE | pass | design.md:24-36 explicit in/out scope: UI (REQ-031/CARD-006) and SSE (REQ-008/CARD-007) out; buildSnapshot called unchanged there. Every task serves AC-1 or AC-2. |
| DSG-NO-CODE | pass | Glob `src/server/milestones*.ts` → no file; design branch is docs-only, milestones.ts exists only as task 1. |

## Blocking findings
None.

## Advisory findings
None citable. Considered: multiple `**Cards:**` lines per block are under-specified (design.md:72 "contributes" — append vs replace unstated), but the stated in-scope assumption (design.md:40-42: `/refine`-authored file, one `**Cards:**` line per block, ids preserved verbatim) defeats it — no concrete defect.
