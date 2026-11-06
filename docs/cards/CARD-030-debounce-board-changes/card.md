---
id: CARD-030
type: feature
layer: api
reqs: [REQ-008]
title: Debounce rapid board changes into one live snapshot
status: backlog
phase: ""
right_sized: true
depends_on: [CARD-029]
branch: ""
worktree: ""
design_pr_url: ""
pr_urls: []
split_slices: 0
adrs: []
reworks:
  slice: 0
  design: 0
  implement: 0
  split: 0
  deliver: 0
review_lenses_failed: []
estimated_lines: 240
actual_lines: ""
started: ""
delivered: ""
created: 2026-07-21
---

## Why
A burst of file writes (e.g. a multi-file card move) reaches connected clients as one correct
snapshot instead of a flicker of partial ones.

## Acceptance criteria
- [ ] Changes are debounced ~200 ms, so a multi-file write emits one correct snapshot rather
      than a burst (REQ-008)

## Notes
Split out of CARD-007. Terminal child of that split — CARD-012 depends on this card.

Wraps the watcher's change handler in a ~200 ms debounce (injectable clock; fake timers for the
unit test) and adds a real-filesystem burst integration test (multiple files written <200 ms
apart → exactly one SSE event reflecting the final state).

The debounce plus full re-parse is what makes partial and multi-file writes **self-healing**:
the next event produces a correct snapshot regardless of what was observed mid-write. That
property is this card's reason to exist, inherited verbatim from CARD-007.

REQ-001 applies: wrap the fs/network-touching exercises in `test/server-guard.ts`'s
`assertNoRepoWrites` / `assertNoNonLoopbackNetwork`, per CARD-006's ADR-0011.
