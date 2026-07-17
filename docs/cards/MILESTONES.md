# Milestones

Ordered delivery milestones, authored by `/refine` and `/requirement`. Document order = delivery order.
`/kanban` reads this file and never writes it.

## M1 — Toolchain and delivery pipeline
**Goal:** The repo builds, lints and tests itself on every pull request, and a version tag ships the package.
**Exit criteria:** A pull request reports a red check when lint, typecheck, test or build fails; pushing a `vX.Y.Z` tag whose version matches `package.json` publishes to npm with provenance and cuts a GitHub Release, and a mismatched tag publishes nothing.
**Cards:** CARD-001, CARD-002, CARD-003

<!--
Milestones for REQ-001..REQ-035 (the viewer itself) are not yet authored — the backlog
has not been sliced. The next `/refine` run adds them after M1, and must treat CARD-001
as existing board state: it is the scaffold card, so `/refine` wires `depends_on` to it
rather than proposing a second scaffold.
-->
