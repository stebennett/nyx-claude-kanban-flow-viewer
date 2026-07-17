---
id: CARD-016
type: feature
layer: web
reqs: [REQ-032]
title: Card detail panel
status: backlog
phase: backlog
right_sized: ""
depends_on: [CARD-009, CARD-008]
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
estimated_lines: 502
actual_lines: ""
started: ""
delivered: ""
created: 2026-07-17
---

## Why
The full story of one card — why it exists, where it stands, and every phase doc produced
along the way. The board shows movement; this shows reasoning.

## Acceptance criteria
- [ ] Clicking a card opens a side panel showing the Why paragraph, the acceptance-criteria checklist with checked state, and Notes (REQ-032)
- [ ] A compact frontmatter table shows branch, worktree, ADRs, estimated vs actual lines and dates (REQ-032)
- [ ] One tab renders per phase doc found, fetched on open via /api/cards/:id/docs, rendered as markdown and labeled main-checkout vs worktree (REQ-032)

## Notes
**Split seam, recorded at intake.** Estimated at 502 against a `size_limit` of 500 — a
straddle, not a confident breach: the overage is dominated by an unmade styling decision
(plain CSS ~70 lines vs a utility framework ~0), which swings this card by ±70 on its own.
Left to `SLC-SIZE`, which re-checks at pickup against a real tree. If a split is needed the
seam is clean and also simplifies the DAG:
- **(a) the panel** — Why, criteria checklist, Notes, frontmatter table (AC-1, AC-2);
  `depends_on: [CARD-009]` only.
- **(b) the phase-doc tabs** — fetch on open, markdown, source labels (AC-3);
  `depends_on: [(a), CARD-008]`.

The `depends_on: [CARD-008]` edge on this card exists solely for AC-3.

AC-2 renders `branch`, `worktree` and `adrs`, which REQ-020's field list does not
enumerate. They arrive anyway because they are frontmatter and the parser's gray-matter
clause reaches them — but the spec is thin here and is a `/requirement` candidate.

Docs absent from both checkout and worktree simply get no tab; that fallback is CARD-008
AC-4's behaviour, asserted here at the UI level.
