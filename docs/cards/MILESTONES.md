# Milestones

Ordered delivery milestones, authored by `/refine` and `/requirement`. Document order = delivery order.
`/kanban` reads this file and never writes it.

## M1 — Toolchain and delivery pipeline
**Goal:** The repo builds, lints and tests itself on every pull request, and a version tag ships the package.
**Exit criteria:** A pull request reports a red check when lint, typecheck, test or build fails; pushing a `vX.Y.Z` tag whose version matches `package.json` publishes to npm with provenance and cuts a GitHub Release, and a mismatched tag publishes nothing.
**Cards:** CARD-001, CARD-002, CARD-003

## M2 — Headless board API
**Goal:** `npx kanban-flow-viewer <repo>` parses a real board and serves it over HTTP and SSE, with no UI.
**Exit criteria:** Run against a fixture board, the CLI returns a correct snapshot from `GET /api/board`, streams a new one over `GET /api/events` within ~200 ms of a card file changing, serves a card's phase docs from its worktree, and exits non-zero with a clear message on a directory that holds no board.
**Cards:** CARD-019, CARD-020, CARD-005, CARD-006, CARD-018, CARD-007, CARD-008

## M3 — Live board UI
**Goal:** The board is visible in a browser and updates itself as cards move on disk.
**Exit criteria:** A browser at `/` shows every card in its flow column with full anatomy, blocked cards flagged in their underlying phase's column, terminal cards in the drawer, unrecognized statuses in the overflow column, unparseable files in the tray, and a card moving on disk animates across without a reload.
**Cards:** CARD-009, CARD-010, CARD-011, CARD-012, CARD-013, CARD-017

## M4 — Detail, milestones and activity
**Goal:** The board explains itself — per-card detail with phase docs, milestone progress, and a session activity feed.
**Exit criteria:** Clicking a card opens its detail panel with a tab per phase doc found; the milestones strip shows per-milestone completion; the activity feed logs moves and criteria changes with timestamps.
**Cards:** CARD-014, CARD-015, CARD-016
