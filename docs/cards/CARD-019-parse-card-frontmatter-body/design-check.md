---
verdict: pass
criteria: {DSG-AC-COVERED: pass, DSG-SPEC-FIDELITY: pass, DSG-TASK-TDD: pass, DSG-DOCTRINE: pass, DSG-ADR-NEEDED: pass, DSG-KNOWLEDGE: pass, DSG-SCOPE: pass, DSG-NO-CODE: pass}
---
## Verdict
**pass** — no blocking findings. Two advisories ride the design PR. The design is a faithful, well-scoped
domain-layer parser: pure `parseCard(raw, options)`, AC-4 genuinely satisfied by construction, the
CARD-020 additivity premise holds, AC-2 heading-scoping is proven non-vacuously, and the unquoted-date
gotcha is handled.

## Criteria
| id | verdict | evidence |
|---|---|---|
| DSG-AC-COVERED | pass | All 5 ACs map: AC-1→tasks 2+4; AC-2→tasks 6+7; AC-3→task 5; AC-4→task 2 by construction (pure fn + inline-string fixtures); AC-5→task 3. No AC unmapped; no task serves no AC. |
| DSG-SPEC-FIDELITY | pass | Cited REQ-002/020/021 (primary) + REQ-006/016/019/027/032/033/018 all match spec.md; string-typed status honours REQ-027/033; no-fs/no-GitHub honours REQ-002/021. REQ-020's list omits branch/worktree/adrs but the design adds them citing REQ-032/018 (a superset, not a contradiction). |
| DSG-TASK-TDD | pass | Tasks file-level, test-first each cycle: task 2 writes test→red→creates module; tasks 3-6 add tests→red→implement; task 7 property; tasks 1 (deps) + 8 (gates) non-test infra, correctly sequenced (tsconfig edit deferred to task 2 per TS6053, matching CARD-001 KNOWLEDGE). |
| DSG-DOCTRINE | pass | Determinism honoured: pure fn, inline fixtures, no fs/network. Numeric-precision / parallel-derived / as-of = na. Advisory: fast-check property does not pin a seed. |
| DSG-ADR-NEEDED | pass | One ADR proposed for the cross-cutting CardModel/mapping contract — genuinely expensive-to-reverse, non-duplicative of ADR-0001/0002/0003, does NOT assume a number (0004 reserved by CARD-002). Advisory: gray-matter in `dependencies` makes ADR-0002's 'zero runtime deps' consequence stale, unacknowledged. |
| DSG-KNOWLEDGE | pass | Leans correctly on CARD-004 (single snake→camel mapping point), CARD-001 (dependencies empty→first runtime dep is gray-matter; composite tsconfig.test.json include; coverage=core-logic layer; tsc -b --noEmit). No recorded gotcha re-tread: tsconfig.server.json already excludes *.test.ts; tsconfig.test.json addition mirrors the paths.ts precedent (source listed explicitly, test via glob). |
| DSG-SCOPE | pass | Explicit in/out. Phase-doc scan/REQ-025 (CARD-020) and snapshot/parseErrors/REQ-019/033 (CARD-005) correctly excluded; REQ-032 item-list deferred. blocker + branch/worktree/adrs justified via REQ-020/032/018, not creep. |
| DSG-NO-CODE | pass | Filesystem-verified: only design.md under docs/cards/CARD-019-*/; src/server/ has no parse-card.ts/card-model.ts; package.json `dependencies: {}` unchanged; tsconfig.test.json still the original include; no .github/ change. |

## Blocking findings
None.

## Advisory findings
1. **DSG-ADR-NEEDED** — gray-matter added to `dependencies` makes ADR-0002's accepted consequence
   "npx installs zero runtime deps / `dependencies` stays empty" stale. Pre-sanctioned by KNOWLEDGE
   CARD-001, but the proposed ADR should acknowledge it amends ADR-0002's runtime-deps consequence so
   the ADR record stays honest. Not a build-layout reversal, so no supersede required. **[actioned: the
   routed ADR-0005 carries the amendment note.]**
2. **DSG-DOCTRINE** — the fast-check `countCriteria` property does not pin a seed; the Determinism
   doctrine calls for a fixed seed. The property is a true invariant so it is not flaky, but pinning
   (seed + numRuns) aids reproducibility. **[to carry into the implement dispatch.]**
