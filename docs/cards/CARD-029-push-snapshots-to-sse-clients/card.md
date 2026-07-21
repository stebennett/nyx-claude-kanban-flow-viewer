---
id: CARD-029
type: feature
layer: api
reqs: [REQ-008, REQ-017]
title: Push watcher snapshots to connected SSE clients on a board change
status: backlog
phase: ""
right_sized: true
depends_on: [CARD-027, CARD-028]
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
estimated_lines: 187
actual_lines: ""
started: ""
delivered: ""
created: 2026-07-21
---

## Why
The board updates automatically for anyone with the page open, the moment a card file changes
on disk — no reload.

## Acceptance criteria
- [ ] Changing a card file under `board_dir` pushes a new full snapshot to every connected
      `/api/events` client (REQ-008 push clause, REQ-017)

## Notes
Split out of CARD-007.

Wires CARD-028's `watchBoard`'s `onSnapshot` into CARD-027's `hub.publish` inside `index.ts`;
one real-fs, real-SSE integration test proves the whole path (mutate a file → client receives
the new frame). This is the transport-adoption step for CARD-028's module, exactly as CARD-006
was for `buildSnapshot()`.

Full snapshots only — no granular or patch events.

REQ-001 applies: wrap the fs/network-touching exercises in `test/server-guard.ts`'s
`assertNoRepoWrites` / `assertNoNonLoopbackNetwork`, per CARD-006's ADR-0011.
