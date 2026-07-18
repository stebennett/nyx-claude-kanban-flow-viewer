---
verdict: pass
criteria: {SPL-NO-LOSS: na, SPL-GREEN: pass, SPL-SIZE: pass, SPL-ORDER: na, SPL-FILES: na, SPL-COHERENT: na}
---
# Split check — CARD-019 (refusal)

## Verdict
Pass — the refusal is honest, not lazy. Re-derived the change set independently
(`git diff --no-renames --name-status/--numstat origin/main...task/019-parse-card-frontmatter-body`,
never trusting HEAD): 6 non-excluded paths, 601 lines. The decisive claim — the coverage-irreducible
pair `parse-card.ts` (127) + `parse-card.test.ts` (415) = **542 > size_limit 500 on its own** — is
arithmetically exact and independently verified. No green sub-500 carve exists.

## Criteria
| id | verdict | evidence |
|---|---|---|
| SPL-NO-LOSS | na | 0 slices (refusal) — nothing carved, so the union comparison doesn't apply. The whole unmodified branch ships as one oversized PR (the refusal fallback), so nothing is dropped or invented. |
| SPL-GREEN | pass | split.md's Environment section (whole change green: ci/lint/typecheck/build/test 34/34/coverage 100%) matches implement.md's independently-produced gate evidence written before split.md. The two coupling REDs (package.json-without-packaging.test.ts → the exact zero-runtime-deps assertion failure; parse-card.ts-without-its-test → 7.21% aggregate, lines 1-127 uncovered) are specific tool-shaped outputs consistent with genuine runs. |
| SPL-SIZE | pass | Re-summed per-file added+deleted from `--numstat` myself: package.json 7, card-model.ts 39, parse-card.test.ts 415, parse-card.ts 127, packaging.test.ts 4, tsconfig.test.json 9 = 601 (exact match). Confirmed the coverage coupling: `origin/main`'s `src/server/` holds only `index.ts` (excluded) + a 14-line `paths.ts`; `vite.config.ts` sets aggregate (not per-file) v8 thresholds, so a 127-line 0%-covered `parse-card.ts` craters the aggregate far below 90% — corroborating the measured 7.21%. `card-model.ts` read in full: pure interfaces, 0 executable statements, cannot anchor coverage. Since the 542-line pair alone exceeds 500, no arrangement of the other 4 files (59 lines) yields a green sub-500 carve. |
| SPL-ORDER | na | 0 slices — nothing to sequence. |
| SPL-FILES | na | 0 slices — no path assigned to a slice; whole-file granularity was respected in the splitter's candidate-carve tests (each file tested complete/unmodified). |
| SPL-COHERENT | na | 0 slices — no slice diff to judge. |

## Blocking findings
None.

## Advisory findings
- `split.md` originally stated "8 non-excluded changed paths"; the correct count is 6 (line totals were
  always exact). Corrected in split.md; no effect on the refusal's validity.
