# Board

_Rendered by `/kanban`. Do not hand-edit below the header._

**WIP / Gates:** wip_limit 3 · slice=auto · design=pr · deliver=auto
_last rendered: 2026-07-19_

## Backlog
- CARD-022 — Add milestone progress to the board snapshot · backlog [M2]
- CARD-006 — Serve the parsed board over HTTP · backlog [M2]
- CARD-007 — Push live snapshots over SSE · backlog [M2]
- CARD-008 — Serve a card's phase docs · backlog [M2]
- CARD-009 — Serve the SPA and render eight flow columns · backlog [M3]
- CARD-010 — Card anatomy · backlog [M3]
- CARD-011 — Blocked flag, terminal drawer, and overflow column · backlog [M3]
- CARD-012 — Live connection and header · backlog [M3]
- CARD-013 — Animate moves by diffing snapshots · backlog [M3]
- CARD-014 — Activity feed · backlog [M4]
- CARD-015 — Milestones strip · backlog [M4]
- CARD-016 — Card detail panel · backlog [M4]
- CARD-017 — Unparseable tray · backlog [M3]
- CARD-018 — CLI flags and startup validation · backlog [M2]

## Slice

## Design

## Implement
- CARD-021 — Assemble a board snapshot from cards, config and parse errors · implement · task/021-assemble-board-snapshot [M2]

## Test
- CARD-003 — Publish npm package and GitHub Release on a vX.Y.Z tag · test · task/003-release-on-version-tag [M1]

## Review

## Deliver

## Blocked

## Done
- CARD-001 — Scaffold the TypeScript package and toolchain · delivered 2026-07-18 · PRs #1 (design) + #3 · 372 lines · 1 rework [M1]
- CARD-002 — Run lint, typecheck, tests and build on every pull request · delivered 2026-07-18 · PRs #6 (design) + #25 · 191 lines · 1 deliver rework [M1]
- CARD-019 — Parse card.md frontmatter and body into the card model · delivered 2026-07-18 · PRs #7 (design) + #9 · 601 lines · 1 rework [M2]
- CARD-020 — Record phase-doc presence in the card model · delivered 2026-07-18 · PRs #20 (design) + #24 · 185 lines · 0 reworks [M2]

## Split
- CARD-004 — Parse a card.md into the card model → split into CARD-019, CARD-020 [M2]
- CARD-005 — Build a board snapshot from the board directory → split into CARD-021, CARD-022 [M2]

## Superseded

## Milestones
- M1 — Toolchain and delivery pipeline · 2/3 · in progress
- M2 — Headless board API · 2/8 · in progress
- M3 — Live board UI · 0/6 · not started
- M4 — Detail, milestones and activity · 0/3 · not started
