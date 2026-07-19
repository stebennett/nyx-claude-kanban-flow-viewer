---
id: CARD-003
type: task
layer: infra
reqs: [REQ-007, REQ-037]
title: Publish npm package and GitHub Release on a vX.Y.Z tag
status: test
phase: test
right_sized: true
depends_on: [CARD-001, CARD-002]
branch: task/003-release-on-version-tag
worktree: .worktrees/CARD-003-release-on-version-tag
design_pr_url: https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/28
pr_urls: []
split_slices: 0
adrs: [ADR-0007]
reworks:
  slice: 0
  design: 0
  implement: 2
  split: 0
  deliver: 0
review_lenses_failed: [tests]
estimated_lines: 110
actual_lines: ""
started: 2026-07-18
delivered: ""
created: 2026-07-17
---

## Why
Makes `npx kanban-flow-viewer` actually reachable by end users, and makes cutting a
version a single tag push rather than a manual ritual. The tag/version guard exists
because an npm publish is effectively permanent — npm forbids republishing a version, so
a wrong-version publish cannot be taken back.

## Acceptance criteria
- [ ] Pushing a `vX.Y.Z` tag triggers the release workflow; other tag shapes do not (REQ-037)
- [ ] A tag not matching package.json's version fails the workflow and publishes nothing (REQ-037)
- [ ] On match, the package builds and publishes to npm with provenance (REQ-037, REQ-007)
- [ ] A GitHub Release is created for the tag with generated notes (REQ-037)
- [ ] The release workflow runs lint, typecheck, test and build before the publish step; any gate failing fails the workflow and publishes nothing (REQ-037)

## Notes
**Design-phase note carried from the intake check.** REQ-037 requires "the **same** gates
as REQ-036" before publishing. "Same" is anchored to CARD-002's workflow, so AC-5 is only
verifiable against a CARD-002 that already exists — hence the `depends_on` edge. Reusing
CARD-002's gates via `workflow_call` is the default route; duplicating them inline in
`release.yml` requires explicit justification, because the two gate lists can then drift
and REQ-037 becomes false without any card's criteria failing.

**Manual prerequisite:** publishing needs an `NPM_TOKEN` secret configured on the repo. No
card can create it. The workflow also needs `permissions: id-token: write` (for provenance)
and `contents: write` (for the Release).

`right_sized: true` at intake, so the slice phase is skipped: `estimated_lines: 110` from
`card-intake-checker` (INT-SIZED) is this card's only pre-code size check. Both design
routes converge (~102 reusing, ~100–110 inline), so the estimate is robust to the choice.
