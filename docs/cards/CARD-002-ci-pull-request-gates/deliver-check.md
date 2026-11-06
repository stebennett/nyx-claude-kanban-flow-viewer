---
verdict: pass
criteria: {DLV-BASE: pass, DLV-BODY-TRUE: pass, DLV-CI: pass, DLV-DOCS: pass, DLV-PURITY: pass, DLV-SIZE: pass}
---
# CARD-002 — Deliver check (implementation, PR #25)

**Pass after one deliver rework.** The first CI run (run 29651179125, commit `f34566d`) was RED at
`npm run build` (`Cannot find module @rollup/rollup-linux-x64-gnu`) — the rebase's lockfile regeneration
on macOS/ARM had collapsed rollup's `optionalDependencies` platform matrix from 25 entries to 1. Fixed by
restoring the full lockfile + `npm install --package-lock-only` (25 platform binaries preserved), pushed
as commit `94a43c4`. The re-run (run 29651484588, commit `94a43c4` = PR head) concluded **success**.

## Criteria
| id | verdict | evidence |
|---|---|---|
| DLV-BASE | pass | base main, head task/002-ci-pull-request-gates, state OPEN; merge-base(origin/main, head) == origin/main tip. |
| DLV-BODY-TRUE | pass | ci.yml triggers/step-order (build-before-test) claims, js-yaml+@types/js-yaml devDeps, ADR-0004→Superseded / ADR-0006 Accepted(supersedes ADR-0004) all verified in diff. |
| DLV-SIZE | pass | actual_lines 191 (ci.yml 22, adr-0004 8, adr-0006 59, adrs/README 3, package.json 4, ci-workflow.test.ts 95); excluded package-lock.json (size_exclude) and docs/cards/** (own phase docs). estimated_lines 68 — ~2.8x over, well under size_limit 500. The lockfile fix touched only package-lock.json (size_excluded) — no change to this count. |
| DLV-DOCS | pass | implement.md, test.md (verdict: pass), review.md (verdict: pass, review_lenses_failed: []) present. No split.md (correct, under size_limit). design.md/design-check.md/deliver-check-design.md correctly absent (rode merged PR #6). |
| DLV-PURITY | pass | File set: ci.yml, adr-0004 edit, adr-0006 new, adrs/README, CARD-002 phase docs, package.json, package-lock.json, test/ci-workflow.test.ts — all in scope; no CARD-019/020 source. The .github/workflows/ file is this card's deliverable. |
| DLV-CI | pass | `gh pr view 25 --json statusCheckRollup` → check `gates` COMPLETED / conclusion SUCCESS on head commit `94a43c4`. `gh run list` confirms run 29651484588 (sha 94a43c4) = success; the earlier failure (29651179125, sha f34566d) is superseded by the lockfile fix. CI is green, not red. |

## Size
actual_lines: 191. Excluded: package-lock.json (size_exclude), docs/cards/** (own phase docs). estimated_lines: 68 — over estimate (~2.8x), under size_limit (500); no split needed.

## Rework history
- Deliver rework 1/1 (check_budget.deliver = 1): DLV-CI red (rollup optionalDependencies lockfile collapse) → lockfile fix (full 25-platform matrix restored) → CI re-run green. No further rework budget; none needed.

## Blocking findings
None (the DLV-CI blocker from the first pass is resolved — CI green on the fixed commit).

## Advisory findings
- DLV-SIZE: actual_lines 191 vs. estimated_lines 68 (~2.8x) — no breach, informational for /retro (the 95-line YAML-contract test + 59-line new ADR ran larger than the slicer's estimate).
