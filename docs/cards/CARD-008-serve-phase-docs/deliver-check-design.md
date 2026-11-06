---
phase: check
checks: deliver
card: CARD-008
pr: https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/62
verdict: pass
criteria:
  DLV-BASE: pass
  DLV-BODY-TRUE: pass
  DLV-CI: pass
  DLV-DOCS: pass
  DLV-PURITY: pass
  DLV-SIZE: na
---

# CARD-008 — design-PR deliver check (PR #62)

## Verdict
**pass.** No blocking findings. All six `DLV-*` criteria verdicted; `DLV-SIZE` is `na` (design PR,
exempt per `checks/deliver.md`). `DLV-BODY-TRUE` was checked claim-by-claim against the diff and, for
the one claim about deleted content, against git history — every claim holds.

## Criteria
| id | verdict | evidence |
|---|---|---|
| DLV-BASE | pass | `gh pr view` → `baseRefName:"main"`. `git merge-base origin/main feature/008-serve-phase-docs-design` = `29ff50b`, which equals `origin/main`'s tip after fetch — branch cut cleanly, no drift. |
| DLV-BODY-TRUE | pass | Seven claims checked individually, see below; all confirmed against the diff / branch tip / git history. |
| DLV-CI | pass | `gh pr checks pull/62` → "Passed: 1, Failed: 0". Green. |
| DLV-DOCS | pass | Diff files: `slice.md`, `slice-check.md`, `design.md`, `design-check.md`, `docs/adrs/0013-…md`, `pr-body.md` — the full design-PR doc set rides the PR. |
| DLV-PURITY | pass | All 6 changed paths are under `docs/adrs/**` or `docs/cards/CARD-008-serve-phase-docs/**`; `src/` untouched (0 files in the diff). |
| DLV-SIZE | na | `checks/deliver.md`: implementation PRs only — "a design PR is exempt (a long design document is not a code-review problem)". `size_exclude` is irrelevant here because the criterion does not apply at all, not because of what it would exclude. |

## Body-claim verification
1. **"pass on all eight DSG-* criteria" / "six advisories"** — `design-check.md` frontmatter
   `verdict: pass`, `criteria:` map has exactly the 8 ids from `checks/ids.md`'s design set, all `pass`.
   `## Advisory findings` lists A1–A6 = 6; `## Blocking findings` = "None". Exactly as claimed.
2. **"the first design's ADR claimed CARD-023 would 'populate' `repoRoot` and would change 'only the
   second expression'"** — the pre-rework `design-check.md` is deleted from the branch tip (correct
   protocol), so this is **not verifiable from the diff alone**. Verified from git history instead: the
   pre-rework commit `8a63094` quotes the old `design.md` verbatim — "this card introduces only the
   repoRoot option field CARD-023 will populate" and "CARD-023 changes only the second expression".
   Both phrases present word for word. Separately confirmed the CURRENT `design.md` and ADR-0013
   contain neither (`grep -in "populate\|only the second"` → no match). Claim accurate; correction real.
3. **"ADR-0013 names the CARD-008-first merge deviation … 'an expectation, not a surprise'"** —
   present in Consequences, matching phrase, including the `tsc -b --noEmit` clause.
4. **"~478 … design check independently derived ~468 … both inside slice-check's 416/483 band"** —
   `design.md` budget table total row `| total | ~516 | ~478 |`; `design-check.md` A1 gives ~468;
   `slice-check.md` gives 416 central / 483 drift-adjusted. Both figures fall inside [416, 483].
5. **"`deliver-1.md`/`deliver-2.md` are real files … while their check-doc counterparts are served"** —
   `git ls-tree -r --name-only origin/main -- docs/cards` finds `CARD-006-…/deliver-1.md`,
   `CARD-021-…/deliver-1.md`, `CARD-021-…/deliver-2.md`, plus both cards' `deliver-check-1.md` /
   `deliver-check-2.md`. Confirmed on both sides.
6. **"`deliver-check-design.md` is a real filename (8 instances)"** — exactly 8 on `origin/main`
   (CARD-001/002/003/006/019/020/021/022). Note the **local primary checkout** shows **9**, because the
   bookkeeping branch is ahead with CARD-023's still-unmerged copy. Counted against the PR's actual base
   the claimed 8 is correct — see the KNOWLEDGE entry this produced.
7. **"ADR-0013 … Extends ADR-0010; supersedes nothing"** — frontmatter `supersedes: []`, body text
   matches.

## Size
`na` (design PR). For the record: `git diff --numstat origin/main...feature/008-serve-phase-docs-design`
totals **829** added / 0 deleted, entirely under `docs/adrs/**` (88) and
`docs/cards/CARD-008-serve-phase-docs/**` (741) — phase-doc and ADR paper, not code, which is exactly
why the criterion does not apply. `estimated_lines: 460` is for the eventual *implementation* PR.

## Blocking findings
None.

## Advisory findings
None from this checker. `design-check.md`'s six advisories (A1–A6) already ride the PR from the design
phase and are not re-litigated here.

## Observation carried to the orchestrator — the ADR index is stale
`docs/adrs/README.md` on `origin/main` still lists only ADR-0001…0011. ADR-0012 (CARD-023, PR #61),
ADR-0013 (this PR) and ADR-0014 (CARD-027) are each committed on their own design branch and none is
indexed. The PR body makes no claim about the index, so this is neither a `DLV-BODY-TRUE` nor a
`DLV-DOCS` finding — but the index is real documentation and is now three entries behind.

**Orchestrator decision:** the rows are deliberately *not* added on the design branches. Three branches
each appending to the same file would conflict on merge, and a row added on the state branch would point
at an ADR file that does not exist on `main` yet — a dangling reference. The correct moment is
**reconcile**: as each design PR merges, `/kanban` adds that ADR's row to `README.md` in the same state
commit that records the merge. Recorded here so the gap is tracked rather than forgotten.
