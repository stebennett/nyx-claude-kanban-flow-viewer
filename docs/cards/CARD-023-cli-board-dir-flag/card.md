---
id: CARD-023
type: feature
layer: api
reqs: [REQ-012]
title: CLI --board-dir flag
status: deliver
phase: deliver
right_sized: true
depends_on: [CARD-006]
branch: feature/023-cli-board-dir-flag
worktree: .worktrees/CARD-023-cli-board-dir-flag
design_pr_url: https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/61
pr_urls: []
split_slices: 0
adrs: [ADR-0012]
reworks:
  slice: 0
  design: 0
  implement: 0
  split: 0
  deliver: 0
review_lenses_failed: []
estimated_lines: 130
actual_lines: ""
started: 2026-07-21
delivered: ""
created: 2026-07-21
---

## Why
Lets the CLI point at a board that isn't at the default `docs/cards` path; also introduces
the shared `args.ts` module every later flag card extends.

## Acceptance criteria
- [ ] `--board-dir` defaults to `docs/cards` when not passed (REQ-012)
- [ ] `--board-dir <path>` parses and serves the board at that repo-relative path (not just the default) — a second fixture board at a non-default path proves the path-resolution half of REQ-012, not only the default

## Notes
Split out of CARD-018.

Inherits CARD-018's intake finding: AC-2 asserts **both** halves of REQ-012 — the default
*and* that a given path is honoured. Testing only the default leaves path resolution
unobserved, so this needs a second fixture board at a non-default path.

REQ-001 applies to the directory reads and is not asserted here — see CARD-006's design
note on siting the no-write guard suite-wide.

**Design-time size re-estimate (2026-07-21): ~410 lines against the carve-time
`estimated_lines: 130`** — a 3.2x delta, confirmed independently by the design check with per-file
working (`args.ts` ~80, `args.test.ts` ~245, `test/board-fixture.ts` ~55, plus ~30 changed). Not
scope creep: every task maps to an AC, and the carve-time 130 priced `args.test.ts` at ~70 with **no
server-level test at all**, while AC-2 (an intake-mandated finding) demands a two-board proof through
the real server. `estimated_lines` is deliberately left at 130 so the miss stays visible to `/retro`
rather than being laundered. ~410 is still 18% under `size_limit` 500, but the margin is thin on a
project that has twice run ~2x its design-time figure — if trimming is needed, the design check named
task 4's property pair (~30 lines) as the only work not tied to an AC.

First of CARD-018's four children, and the one that establishes `src/server/args.ts`. The
siblings are chained (CARD-024 → CARD-025 → CARD-026) because all four extend `args.ts` and
`index.ts` incrementally; the chain avoids parallel branches conflicting on those files.
