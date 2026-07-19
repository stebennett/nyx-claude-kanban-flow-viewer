---
verdict: pass
criteria: {DLV-BASE: pass, DLV-BODY-TRUE: pass, DLV-SIZE: pass, DLV-DOCS: pass, DLV-PURITY: pass, DLV-CI: pass}
---
# CARD-003 — deliver-check (implementation PR #39)

## Criteria
| id | verdict | evidence |
|---|---|---|
| DLV-BASE | pass | PR #39 base `main`, head `task/003-release-on-version-tag`. |
| DLV-BODY-TRUE | pass | Every body claim checked against `git diff origin/main...task/003-release-on-version-tag`: release.yml has workflow_call reuse, SHA-pinned checkout@…v4.2.2 / setup-node@…v4.1.0, version-guard `exit 1` on `"$GITHUB_REF_NAME" != "v${VERSION}"`, `npm ci`→build→`npm publish --provenance`, `gh release create "$GITHUB_REF_NAME" --generate-notes`, least-privilege permissions; package.json gained `repository.url`; test file has exactly 13 `it()` cases (grep-verified). All 5 ACs trace to a named test. No unsupported claim. |
| DLV-SIZE | pass | Excluding `docs/cards/**`: release.yml 41 + package.json 4 + test/release-workflow.test.ts 224 = **269** < 500. Delta vs estimate 110 is +159, from the 224-line contract-test suite. Not a breach. |
| DLV-DOCS | pass | implement.md, test.md (`verdict: pass`), review.md (`verdict: pass`) all present — unsplit impl PR, checks all on. |
| DLV-PURITY | pass | File list is card-scoped only (release.yml, package.json, test/release-workflow.test.ts + phase docs); no unrelated src/ or ci.yml changes. |
| DLV-CI | pass | `gh pr checks #39`: `gates` = SUCCESS (green, not pending). |

## Size
actual_lines: 269 · estimated_lines: 110 (over by 159, the contract-test suite) · well under the 500 cap, no split.

## Findings
None (blocking or advisory).
