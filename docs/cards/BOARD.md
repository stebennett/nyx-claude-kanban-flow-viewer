# Board

_Rendered by `/kanban`. Do not hand-edit below the header._

**WIP / Gates:** wip_limit 3 · slice=auto · design=pr · deliver=auto
_last rendered: 2026-07-20_

## Backlog
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

## Test

## Review

## Deliver
- CARD-006 — Serve the parsed board over HTTP · deliver · feature/006-serve-board-over-http [M2] · split: 2 slices · PR 1/2 #58 open (guard) · checking deliver

## Blocked

## Done
- CARD-001 — Scaffold the TypeScript package and toolchain · delivered 2026-07-18 · PRs #1 (design) + #3 · 372 lines · 1 rework [M1]
- CARD-002 — Run lint, typecheck, tests and build on every pull request · delivered 2026-07-18 · PRs #6 (design) + #25 · 191 lines · 1 deliver rework [M1]
- CARD-003 — Publish npm package and GitHub Release on a vX.Y.Z tag · delivered 2026-07-20 · PRs #28 (design) + #39 · 269 lines · 2 implement reworks [M1]
- CARD-019 — Parse card.md frontmatter and body into the card model · delivered 2026-07-18 · PRs #7 (design) + #9 · 601 lines · 1 rework [M2]
- CARD-020 — Record phase-doc presence in the card model · delivered 2026-07-18 · PRs #20 (design) + #24 · 185 lines · 0 reworks [M2]
- CARD-021 — Assemble a board snapshot from cards, config and parse errors · delivered 2026-07-20 · PRs #29 (design) + #45 + #49 (2 slices) · 507 lines · 1 implement + 1 split rework [M2]
- CARD-022 — Add milestone progress to the board snapshot · delivered 2026-07-20 · PRs #52 (design) + #54 · 325 lines · 1 implement rework (CRLF) [M2]

## Split
- CARD-004 — Parse a card.md into the card model → split into CARD-019, CARD-020 [M2]
- CARD-005 — Build a board snapshot from the board directory → split into CARD-021, CARD-022 [M2]

## Superseded

## Milestones
- M1 — Toolchain and delivery pipeline · 3/3 · complete
- M2 — Headless board API · 4/8 · in progress
- M3 — Live board UI · 0/6 · not started
- M4 — Detail, milestones and activity · 0/3 · not started
