---
phase: check
checks: deliver
card: CARD-023
pr: https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/65
verdict: fail
criteria:
  DLV-BASE: pass
  DLV-BODY-TRUE: fail
  DLV-CI: pass
  DLV-DOCS: pass
  DLV-PURITY: pass
  DLV-SIZE: fail
---

# CARD-023 — deliver check (PR #65, implementation)

## Criteria
| id | verdict | evidence |
|---|---|---|
| DLV-BASE | pass | `gh pr view #65`: base `main`, head `feature/023-cli-board-dir-flag`, matches card.md's `branch`. |
| DLV-BODY-TRUE | **fail** | Claim 1 ("463 added lines against `size_limit` 500") misrepresents compliance: `checks/deliver.md` measures `added + deleted`, giving 463+55 = **518 > 500** — a breach, not compliance. The same undercount was repeated in `test.md`, `review.md` and `implement.md`; `implement.md` additionally cited a **false precedent** ("the added-column measure DLV-SIZE used on CARD-019/CARD-021") — both of those cards had **zero deletions**, so added-only vs added+deleted was never exercised there. Claims 2-6 all verified true (see below). |
| DLV-CI | pass | `gh pr checks #65` → `gates: SUCCESS` (Passed 1, Failed 0). |
| DLV-DOCS | pass | `implement.md`, `test.md`, `review.md` all ride PR #65. `slice.md`/`slice-check.md` correctly absent — `card.md` confirms `right_sized: true`, `split_slices: 0`; never sliced by CARD-018's carve. |
| DLV-PURITY | pass | All six non-docs files trace to CARD-023's scope; no unrelated changes. |
| DLV-SIZE | **fail** (advisory-escalated) | 463 added + 55 deleted = **518** vs `size_limit` 500 — 18 over (3.6%). Breach was concealed rather than disclosed across four phase docs. |

## Claims verified true
- **151/151 tests, coverage 100/98.3/100/100, `args.ts` 100 on all four** — matches `test.md`; CI green.
- **Full 8-lens panel, zero blocking** — `review.md` frontmatter lists 8 lenses, `lenses_failed: []`,
  verdict pass, 14 numbered advisories. Count matches.
- **The four highlighted advisories** — both spot-checked (`withServer` `splice`→`slice` claim-false;
  `parseArgs([''])` returning ok) match `review.md` items 4 and 1 accurately.
- **Design PR #61 merged, ADR-0012 on `main`** — confirmed via `git show main:docs/adrs`.
- **Per-file counts** 108 / 285 / 52 — match `git diff --numstat` exactly.

## Size
`actual_lines: 518` (463 added + 55 deleted), excluding `size_exclude` and `docs/cards/**`
(no lockfile touched). `size_limit: 500` — **18-line breach**. `estimated_lines: 130` → 518 is a 4x miss;
the design-time re-estimate of ~410 was itself added-only and so also undercounted.

## Blocking findings
1. **`DLV-BODY-TRUE`** — the PR body (and `test.md`, `review.md`, `implement.md`) framed 463 added lines
   as compliance with the 500 cap. By the doctrine's own `added + deleted` method the card is **over**.
   *Remedy:* correct all four docs to state `actual_lines: 518` and disclose the breach, then either
   accept it as an advisory breach citing the split proposal below, or execute the split before merge.

## Advisory findings
1. **`DLV-SIZE` breach, with a concrete split proposal** (required by doctrine, not a shrug):
   - **Slice A** (merge first): `test/board-fixture.ts` (+52) + `src/server/http-server.test.ts` (+5/-45)
     = **102 lines**. A pure harness-extraction refactor with zero behavioural change.
   - **Slice B** (built atop A): `src/server/args.ts` (+108) + `args.test.ts` (+285) + `index.ts` (+12/-10)
     + `tsconfig.test.json` (+1) = **416 lines**. The actual REQ-012 feature.
   - 102 + 416 = 518; each PR lands under `size_limit` 500.

## Orchestrator note — self-fix applied, and whose error this was
`DLV-BODY-TRUE` is self-fixable once per criterion per PR, spending no rework budget. This is its first
failure on PR #65, so the fix was applied rather than parking the card:

- `pr-body.md`, `review.md`, `test.md` and `implement.md` now all state `actual_lines: 518` and disclose
  the 18-line breach explicitly, including the correction that the CARD-019/CARD-021 "added-column
  precedent" does not exist.
- `card.md`'s `actual_lines` corrected 463 → 518.
- The live PR body was updated to match.

**The false claim originated with the orchestrator, not the implementer.** `implement.md` reported the
raw figures honestly (463 added / 55 deleted, both stated); the *interpretation* — treating the added
column alone as the measure, and inventing a precedent for it — was written into `review.md` and
`pr-body.md` during review and deliver without checking `checks/deliver.md`'s stated method. The
implementer's own numbers were correct all along.

**The split is not being executed unilaterally.** `DLV-SIZE` is advisory-escalated: the breach is 3.6%,
all gates are green, and the 8-lens panel passed with zero blocking findings. The concrete split above is
recorded for the driver to choose. Executing it means tearing down an open, reviewed, green PR — a call
that belongs to the human, not to a self-fix.
