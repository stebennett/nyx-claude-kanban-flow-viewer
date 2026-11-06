# CARD-023 — deliver (design PR)

## PR
https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/61 — `CARD-023 — design: CLI --board-dir flag`

- Base: `main` · Head: `feature/023-cli-board-dir-flag-design`
- Author: `app/nyxhub-bot` (GitHub App identity confirmed, not personal auth)
- Branch was already current with `origin/main` at delivery; the rebase was a no-op.

## What shipped
Docs-only, verified by `git diff origin/main...HEAD --name-only` before the push — four files, all
under `docs/**`, none under `src/` or `test/`:

| file | role |
|---|---|
| `docs/cards/CARD-023-cli-board-dir-flag/design.md` | the design (committed at design time) |
| `docs/cards/CARD-023-cli-board-dir-flag/design-check.md` | check result, verdict pass |
| `docs/cards/CARD-023-cli-board-dir-flag/pr-body.md` | the PR body, used verbatim |
| `docs/adrs/0012-cli-flags-hand-rolled-pure-args-module.md` | ADR-0012 |

## Notes carried into the PR body
- Size: the design implies ~410 lines against the carve-time `estimated_lines: 130`.
  `estimated_lines` is deliberately unchanged so the miss stays visible to `/retro`.
- A user-visible interval inside M2: `--port` and `--no-open` return `unknown option` and exit 64
  until CARD-025/026 land, where `index.ts` currently ignores them silently.
- ADR-0012 was persisted with two accuracy corrections applied by the orchestrator (an unverifiable
  Node-stability claim removed; the sibling-additivity claim scoped to the parser surface). Both were
  the design check's own recommended remedies. Recorded in `design-check.md`.
