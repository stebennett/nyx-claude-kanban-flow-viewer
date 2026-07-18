---
verdict: pass
criteria: {DLV-BASE: pass, DLV-BODY-TRUE: pass, DLV-CI: pass, DLV-DOCS: pass, DLV-PURITY: pass, DLV-SIZE: na}
---
## Verdict
**pass** — no blocking finding. PR #20 is a clean, docs-only design PR targeting `main` from the
correct branch, carries the expected design-phase doc set with a passing upstream design-check, makes
no over-claim in its body, and has no CI to be red against (none exists on `main` yet).

## Criteria
| id | verdict | evidence |
|---|---|---|
| DLV-BASE | pass | `gh pr view 20 --json baseRefName,headRefName,state` → `baseRefName: main`, `headRefName: task/020-record-phase-doc-presence-design`, `state: OPEN`. Branch name matches the card/design-mode convention. |
| DLV-BODY-TRUE | pass | Claim-by-claim against `design.md`/`design-check.md`: "additive `phaseDocsPresent` field + optional `entries?` option, no signature/arity change" — matches design.md's Interfaces section. "parseCard stays pure, caller does readdir" — matches AC-2 purity test. "PHASE_NAMES lives in dependency-free card-model.ts" — matches design-check.md DSG-KNOWLEDGE and KNOWLEDGE [CARD-020]. "readdir/board-walk scoped to CARD-005, column/rendering to CARD-011" — matches design-check.md DSG-SCOPE. "No new ADR... ADR-0005 already governs" — matches design-check.md DSG-ADR-NEEDED. Both card.md ACs map 1:1 to the design-check's coverage. No over-claim found. |
| DLV-SIZE | na | Design PR — exempt (a design PR is docs-only; DLV-SIZE measures the eventual implementation PR's code+tests). `actual_lines: 0` effective — all 3 changed files (design.md, design-check.md, pr-body.md) are under `docs/cards/**`, which is in `size_exclude`. |
| DLV-DOCS | pass | Design PR doc set present: `design.md` (+131), `design-check.md` (+49, verdict:pass). `pr-body.md` also rides. `slice.md`/`slice-check.md` absent — expected and NOT a finding: `card.md` `right_sized: true`, this right-sized split child of CARD-004 skipped the slice phase. No ADRs — expected: DSG-ADR-NEEDED passes on "no ADR proposed," grounded in ADR-0005 already covering the extension. |
| DLV-PURITY | pass | All 3 changed paths are under `docs/cards/CARD-020-record-phase-doc-presence/`; `gh pr view --json files` confirms no source/test/`.github/` path in the diff. Docs-only, as required for a design PR. |
| DLV-CI | pass | `gh pr checks 20` → "no checks reported on the ... branch" (exit 1). Structural: `git ls-tree -r origin/main --name-only | grep '^.github'` returns empty — no CI workflow exists on `main` yet (CARD-002 parked on the App Workflows permission). Absence of checks is expected, not a red branch — pass by absence. |

## Size
actual_lines: 0 (effective, after size_exclude)
excluded: docs/cards/** (size_exclude) — covers all 3 changed files (design.md +131, design-check.md +49, pr-body.md +47; raw 227, all excluded)
estimated_lines: 145 (card.md) — not comparable here; DLV-SIZE is `na` on a docs-only design PR (it measures the eventual implementation PR's code+tests).

## Blocking findings
None.

## Advisory findings
None from this check. (The design-check.md's own advisory — PHASE_NAMES placed in `card-model.ts`
vs. [CARD-004] KNOWLEDGE's "in the parser" wording, forewarning CARD-011 of the src/server↔src/ui
boundary — already rides the PR via design-check.md and is not re-raised here.)
