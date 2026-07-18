---
verdict: pass
criteria: {DLV-BASE: pass, DLV-BODY-TRUE: pass, DLV-CI: pass, DLV-DOCS: pass, DLV-PURITY: pass, DLV-SIZE: pass}
---
## Verdict
Pass. One advisory finding (DLV-SIZE breach, correctly so — split already run and refused,
refusal independently validated). No blocking findings.

## Criteria
| id | verdict | evidence |
|---|---|---|
| DLV-BASE | pass | `gh pr view 9 --json baseRefName,headRefName` → `baseRefName: main`, `headRefName: task/019-parse-card-frontmatter-body` — matches the card's named branch exactly; state OPEN. |
| DLV-BODY-TRUE | pass | Claim-by-claim against the diff: (1) gray-matter→camelCase fields — `parse-card.ts:96-127` field map, confirmed. (2) `criteria` scoped to `## Acceptance criteria` — `countCriteria`+`extractSection`, confirmed by review.md's mutation proof (unscoped mutation → wrong count). (3) Why/Notes extraction — `extractSection(content,'Why'|'Notes')` calls present. (4) No BOARD.md read "by construction" — `parse-card.ts` imports only `gray-matter`, no fs/network import anywhere in the file; confirmed by direct read. (5) Typed defaults, never throws on missing optional fields — 7 `as*` coercion helpers, all total functions. Testing claims reproduced live: `npm run lint`→0, `npm run typecheck`→0, `npm run build`→0 (vite+tsc both clean), `npm test`→**34/34** (3 files), `npm run test:coverage`→**100/100/100/100** on `parse-card.ts` (`card-model.ts` 0% is expected — type-only, no runtime statements — and the body doesn't claim otherwise). `@types/gray-matter` absent from `node_modules/@types` — confirmed. `test/packaging.test.ts` diff is exactly the one ADR-0005-sanctioned assertion swap (`+2/-2`), verified via `git diff`. Review claims (8-lens panel, one blocking tests-lens finding fixed + re-verified, `review_lenses_failed: []`) match `review.md` frontmatter and body verbatim. No over-claim: body explicitly scopes phase-doc discovery and the `parseErrors` tray to CARD-020/CARD-005, never claims them here. |
| DLV-CI | pass | `gh pr checks 9` → "no checks reported on the branch" (exit 1, not a red result). `git ls-tree origin/main -- .github/workflows` → empty; no CI workflow exists on `main` (CARD-002 not merged), so absence of checks is expected, not a red branch. |
| DLV-DOCS | pass | Impl-PR doc set present in PR #9's file list: `implement.md` (added, 54 lines), `test.md` (added, verdict: pass), `review.md` (added, verdict: pass, 8 lens sections, `review_lenses_failed: []`), `split.md` (added, refusal) + `split-check.md` (added, verdict: pass). All checks policy `on`, so all expected docs must ride — they do. ADR-0005 and design.md/slice.md rode the already-merged design PR #7 (`gh pr view 7` → `state: MERGED`); `docs/adrs/0005-card-model-shape-and-explicit-frontmatter-mapping.md` confirmed present on the repo — their absence from PR #9 is correctly not a finding. |
| DLV-PURITY | pass | Full file list from `gh pr view --json files`: `docs/cards/CARD-019.../{implement,pr-body,review,split-check,split,test}.md`, `package-lock.json`, `package.json`, `src/server/card-model.ts`, `src/server/parse-card.test.ts`, `src/server/parse-card.ts`, `test/packaging.test.ts`, `tsconfig.test.json` — all CARD-019-scoped; no `.github/` files; the `test/packaging.test.ts` edit is the ADR-0005-sanctioned one-liner (confirmed via diff), not scope creep. |
| DLV-SIZE | pass (advisory breach, correctly so) | `git -C worktree diff --numstat origin/main...task/019-parse-card-frontmatter-body`, excluding `size_exclude` (`package-lock.json`, 155 lines) and `docs/cards/**` (385 lines): remaining code files sum to package.json 7 + card-model.ts 39 + parse-card.test.ts 415 + parse-card.ts 127 + packaging.test.ts 4 + tsconfig.test.json 9 = **actual_lines: 601**, vs `size_limit` 500 (breach, ~120% of limit) and `estimated_lines` 300 (2x over estimate). This is the same 601 the PR body discloses and `split-check.md`'s `SPL-SIZE: pass` independently re-derived. A slice-PR breach would be blocking, but this is an **unsplit** PR whose `pr-splitter` run already refused a carve — verified via `split.md`'s coupling analysis (the `parse-card.ts`(127)+`parse-card.test.ts`(415)=542-line pair alone exceeds 500 due to the coverage gate, tested two ways, both RED) — and `split-check.md` independently re-validated the refusal (`verdict: pass`, `SPL-SIZE: pass`, `SPL-GREEN: pass`). A split of an already-split-and-refused card is forbidden, so this verdicts **pass** with the breach recorded as advisory (no further split proposed — none exists; see split.md's arithmetic). |

## Size
actual_lines: 601
excluded: package-lock.json (155), docs/cards/** (385)
size_limit: 500 (breach: +101, ~20% over)
estimated_lines: 300 (actual is 2.0x estimate)

## Blocking findings
None.

## Advisory findings
- criterion: DLV-SIZE
  detail: "actual_lines 601 > size_limit 500. No remedy proposed: pr-splitter already ran and refused
    a carve (split.md), and card-split-checker independently validated the refusal (split-check.md,
    verdict pass, SPL-SIZE pass) — the parser (127 lines) + its coverage-coupled test suite (415
    lines) sum to 542 lines on their own, already over the cap, and cannot ship apart without the
    90%-coverage gate going red on either half. We never split a split; this rides as one PR by
    design."
  location: "split.md:1-46, split-check.md:14-23"
