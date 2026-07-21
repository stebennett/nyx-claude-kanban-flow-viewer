---
phase: check
checks: deliver
card: CARD-027
pr: https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/63
verdict: pass
criteria:
  DLV-BASE: pass
  DLV-BODY-TRUE: pass
  DLV-CI: pass
  DLV-DOCS: pass
  DLV-PURITY: pass
  DLV-SIZE: na
---

# CARD-027 — design-PR deliver check (PR #63)

## Verdict
**Pass.** All six DLV-* criteria clear; no blocking or advisory findings. Design PR #63 targets `main`
from the correct branch, carries only docs (design.md, design-check.md, ADR-0014, pr-body.md), CI is
green, and every checkable claim in the PR body (design-check pass/advisory counts, the pre-rework
AC-2(b) defect description, current 3a/3b tasks, ADR-0014's no-cover clause, both size figures, the
`requestTimeout` probe, and ADR numbering) verifies against the diff or branch history.

## Criteria
| id | verdict | evidence |
|---|---|---|
| DLV-BASE | pass | `gh pr view 63 --json baseRefName,headRefName`: base `main`, head `feature/027-sse-snapshot-on-connect-design`, matching `card.md:11` `branch:` exactly. |
| DLV-BODY-TRUE | pass | Checked claim-by-claim: (1) `design-check.md` frontmatter lists all 8 `DSG-*` → `pass`; body's `## Advisory findings` has exactly 5 numbered items — matches "pass on all eight… five advisories". (2) The original AC-2(b) test text is not on disk (the failing check was superseded per protocol, correctly absent from the diff); recovered from `git log` commit `3e1fccc`'s message ("cannot detect the mutant it exists to catch") — matches the body's "cannot detect the bug it exists to catch"; current `design.md:301-317,373,402-405` has tasks 3a (shape) / 3b (freshness, call-varying provider) with the `p1`/`p2`/`calls === 2` assertions exactly as claimed. (3) `docs/adrs/0014-…md:66-68` states the 500-contract test's provider throws before `writeHead` so no cover here should be claimed — matches "says so plainly rather than claiming cover it doesn't have". (4) `design-check.md` advisory 2: "the ~276 budget is light… At the real rate the total is ~328" — both figures match the body verbatim and are correctly attributed to the design check (not to slice-check, unlike an earlier CARD-006 mis-attribution). (5) `design.md:339-352` task 6 runs the `requestTimeout = 200` probe empirically and records the outcome — matches. (6) `gh pr view 61/62/63 --json files`: ADR-0012→#61, ADR-0013→#62, ADR-0014→#63 only; `gh pr list --state open` confirms no other open PR touches `0014` — no collision. (7) `docs/cards/CARD-007-sse-live-snapshots/slice.md:4` "Split into 4 children" and lines 33-117 name the `GET /api/events` child that became CARD-027 — the "first of four" and slice-terminal-record claims both verify independently. |
| DLV-SIZE | na | Design PR — exempt per `checks/deliver.md` ("a long design document is not a code-review problem"). Reasoned explicitly rather than defaulted: all 4 changed files are docs, zero code touched (confirmed via `gh pr view --json files` and the numstat diff), so no code-review-size concern exists regardless of magnitude. |
| DLV-DOCS | pass | `design.md`, `design-check.md` and ADR-0014 all present in the diff. `slice.md`/`slice-check.md` correctly absent — verified independently, not assumed: `card.md:9` `right_sized: true`, and `docs/cards/CARD-007-sse-live-snapshots/slice.md:4,33-117` / `slice-check.md:29` hold the terminal slice record naming this exact child (`GET /api/events`, REQ-017). |
| DLV-PURITY | pass | `gh pr view 63 --json files`: 4 files, all under `docs/adrs/` or `docs/cards/` — zero `src/**` changes; numstat confirms the same 4 paths. |
| DLV-CI | pass | `gh pr checks 63`: `gates pass 26s`; `gh pr view 63 --json mergeStateStatus`: `CLEAN`. |

## Size
Design PR — `DLV-SIZE: na` (exempt). For the record: `git diff --numstat
origin/main...feature/027-sse-snapshot-on-connect-design` sums to 776 added lines (82 ADR + 137
design-check + 474 design + 83 pr-body), all under `docs/**`. No exclusions applied — the exemption is
total for design PRs, not exclusion-based. `estimated_lines: 195` is a code+test estimate not comparable
to a docs-only PR; the design's re-derived code-size figures (~276 designer / ~328 checker) live in
`design-check.md`, not in this PR's diff-line count.

## Blocking findings
None.

## Advisory findings
None from this check. The five pre-existing advisories from `design-check.md` ride the PR unchanged.
