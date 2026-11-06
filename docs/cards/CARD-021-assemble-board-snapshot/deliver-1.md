# CARD-021 — Deliver (slice 1 of 2)

## PR
https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/45 (implementation, slice 1 of 2 — types)

## What shipped
Slice 1: `src/server/card-model.ts` (+17) — the three JSON-contract interfaces `BoardConfig`,
`ParseError`, `BoardSnapshot`, purely additive with zero consumers. Rides the implementation phase docs
(implement/test/review/split/split-check/split-acceptance).

## Delivery
Slice branch `task/021-assemble-board-snapshot-1` (cut off fresh origin/main) rebased clean. All gates
green: lint, typecheck, `npm test` (54 tests — the type-only slice adds no test file), build; rollup
lockfile matrix intact (25). Pushed; PR #45 opened against main.

## Post-merge
On merge, Reconcile cuts slice 2 (`task/021-assemble-board-snapshot-2`: build-snapshot.ts + its test
suite + tsconfig registration) off the new main that carries these types, and opens PR 2/2. CARD-021 is
done only when both slice PRs are merged and the completeness backstop passes.
