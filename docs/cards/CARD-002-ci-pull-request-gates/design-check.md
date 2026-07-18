---
verdict: pass
criteria: {DSG-AC-COVERED: pass, DSG-SPEC-FIDELITY: pass, DSG-TASK-TDD: pass, DSG-DOCTRINE: pass, DSG-ADR-NEEDED: pass, DSG-KNOWLEDGE: pass, DSG-SCOPE: pass, DSG-NO-CODE: pass}
---
## Verdict
**pass** — no blocking findings. Two advisories ride the design PR. The design wires CI
around CARD-001's existing npm scripts without reimplementing any gate, honours every
CARD-001 KNOWLEDGE entry it leans on, and proposes a well-formed ADR-0004.

## Criteria
| id | verdict | evidence |
|---|---|---|
| DSG-AC-COVERED | pass | card AC-1→design task 1 (test asserts `branches:[main]`); AC-2→task 1 (ordered step run-list) + task 6 (green e2e); AC-3→tasks 2-5 (per-gate seeds); AC-4→task 1 (test asserts `npm ci`, no cache). All four covered. |
| DSG-SPEC-FIDELITY | pass | REQ-036 cited truthfully for the 4 gates + red-on-failure; REQ-037 cited "boundary only" for "same gates"=`workflow_call` reason. The `tsc --noEmit` vs `tsc -b --noEmit` divergence is DISCLOSED (design.md) and ADR-0003-backed, not a silent contradiction. |
| DSG-TASK-TDD | pass | Task 1 is test-first: write `ci-workflow.test.ts` → RED (ci.yml absent) → create ci.yml → GREEN, with revert-mutation checks per assertion. File-level tasks. The structural test asserts literal values + is mutation-validated — not vacuous. |
| DSG-DOCTRINE | pass | Spec-outranks-training: cites REQ/ADRs, no memory. Numeric-precision/parallel-derived/as-of: na — a CI workflow has no money, computed quantities, or per-record figures. Determinism: honoured — contract test reads a committed local file, pure YAML parse; seed proofs are exit-code deterministic. Evidence/YAGNI: tasks paste real output; matrix/fan-out rejected as YAGNI. |
| DSG-ADR-NEEDED | pass | ADR-0004 proposed (single reusable workflow + no build-state cache): genuinely expensive-to-reverse (workflow_call signature becomes CARD-003's contract), full Context/Decision/Consequences, `supersedes: none`. Checked against index (ADR-0001..0003): duplicates/contradicts none. |
| DSG-KNOWLEDGE | pass | Honours every CARD-001 entry it cites: typecheck via `npm run typecheck`=`tsc -b --noEmit` never raw tsc (verified package.json; design.md); no `*.tsbuildinfo` cache without `dist/` — caches NO build state, contract test pins `/tsbuildinfo/` & `/path:\s*dist/` absent; literal-value assertions per KNOWLEDGE. Seed targets exist post-CARD-001. |
| DSG-SCOPE | pass | Explicit In/Out scope. Every task maps to an AC. `workflow_call` exceeds the 4 literal ACs but is sanctioned by CARD-002 Notes ("CARD-003 reuses this workflow's gates — see its notes on workflow_call") and CARD-003 card.md; CARD-003's release job is explicitly out of scope. Coverage-threshold correctly excluded. Only `concurrency` is unsanctioned → advisory below. |
| DSG-NO-CODE | pass | Design branch is docs-only: no `.github/` dir, no `test/ci-workflow.test.ts`, `js-yaml` absent from package.json devDependencies. ci.yml/test appear only as design skeletons and task descriptions. |

## Independent verification (seed isolation, AC-3)
Verified against the real CARD-001 code, not taken on trust:
- `eslint.config.js` uses `tseslint.configs.recommended` (NOT `recommendedTypeChecked`) — no type-aware
  lint rules, so the typecheck seed (`export const seedTypeError: number = 'x'`) stays lint-green while
  going typecheck-red. Isolation holds.
- Lint seed `const _seed = 1;` in `src/server/paths.ts`: `@typescript-eslint/no-unused-vars` has no
  `varsIgnorePattern`, so the `_`-prefixed unused local IS flagged → lint red; `tsconfig.*` set `strict`
  but NOT `noUnusedLocals`, so typecheck stays green. Isolated.
- Build seed (index.html `missing.tsx`): eslint/tsc/vitest never read index.html → only vite build fails.
- All four seed target files exist post-CARD-001.

## Blocking findings
None.

## Advisory findings
1. **DSG-SCOPE — `concurrency` block.** The only addition beyond the 4 literal ACs with no explicit
   sanction (unlike `workflow_call` and `permissions`). Idiomatic CI hygiene, harmless; keep or drop,
   non-blocking.
2. **DSG-AC-COVERED (length) — design.md is 206 lines** vs the ≤150-line advisory budget. Trim on a
   future edit; not required to ship.
