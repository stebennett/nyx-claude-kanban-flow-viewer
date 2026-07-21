# CARD-008 — deliver (design PR)

## PR
https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/62 — `CARD-008 — design: Serve a card's phase docs`

- Base: `main` · Head: `feature/008-serve-phase-docs-design`
- Author: `app/nyxhub-bot` (GitHub App identity confirmed, not personal auth)
- Branch was already current with `origin/main`; no rebase needed.

## What shipped
Docs-only, verified against `origin/main` before the push — six files, all under `docs/**`:

| file | role |
|---|---|
| `docs/cards/CARD-008-serve-phase-docs/slice.md` | keep-as-one verdict (rework 1) |
| `docs/cards/CARD-008-serve-phase-docs/slice-check.md` | slice re-check, verdict pass |
| `docs/cards/CARD-008-serve-phase-docs/design.md` | the design (rework 1) |
| `docs/cards/CARD-008-serve-phase-docs/design-check.md` | design re-check, verdict pass |
| `docs/cards/CARD-008-serve-phase-docs/pr-body.md` | the PR body, used verbatim |
| `docs/adrs/0013-server-path-context-explicit-reporoot.md` | ADR-0013 |

ADR numbering was checked against the sibling design PR #61, which carries ADR-0012 — no collision.

## Notes carried into the PR body
- The card took one design rework: the first ADR asserted a CARD-023 compatibility CARD-023's own
  design contradicted. The rework makes CARD-008 self-sufficient, so merge order is free both ways.
- One documented deviation: if CARD-008 merges first, CARD-023's implementer must add `repoRoot` at
  the `createServer` call and deviate from their own design text. `tsc -b --noEmit` catches it.
- Size ~478 (checker: ~468) against a 500 cap, with the split boundary pre-authorised at the task 5/6
  line.
- Design-check A2 is the one advisory to action at implement time: `index.ts` is coverage-excluded and
  is the only site that *chooses* `repoRoot`, so the value needs a manual smoke as its evidence.
- ADR-0013 was persisted with advisory A6 applied (the merge-order deviation named explicitly).
