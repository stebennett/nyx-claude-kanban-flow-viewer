# Board

_Rendered by `/kanban`. Do not hand-edit below the header._

**WIP / Gates:** wip_limit 3 · slice=auto · design=pr · deliver=auto
_last rendered: 2026-07-21_

## Backlog
- CARD-024 — CLI startup validation for a missing or non-board directory · backlog [M2]
- CARD-025 — CLI --port flag with default and auto-increment · backlog [M2]
- CARD-026 — CLI --no-open flag and default browser launch · backlog [M2]
- CARD-009 — Serve the SPA and render eight flow columns · backlog [M3]
- CARD-010 — Card anatomy · backlog [M3]
- CARD-011 — Blocked flag, terminal drawer, and overflow column · backlog [M3]
- CARD-012 — Live connection and header · backlog [M3]
- CARD-013 — Animate moves by diffing snapshots · backlog [M3]
- CARD-014 — Activity feed · backlog [M4]
- CARD-015 — Milestones strip · backlog [M4]
- CARD-016 — Card detail panel · backlog [M4]
- CARD-017 — Unparseable tray · backlog [M3]

## Slice
- CARD-007 — Push live snapshots over SSE · slice [M2] · slice-check failed SLC-SIZE (child 2 margin too thin) — re-slicing, reworks.slice 1/2
- CARD-008 — Serve a card's phase docs · slice [M2] · slice-check failed SLC-VERDICT (split not necessary) — re-slicing for keep-as-one, reworks.slice 1/2

## Design
- CARD-023 — CLI --board-dir flag · design · feature/023-cli-board-dir-flag-design [M2]

## Implement

## Test

## Review

## Deliver

## Blocked

## Done
- CARD-001 — Scaffold the TypeScript package and toolchain · delivered 2026-07-18 · PRs #1 (design) + #3 · 372 lines · 1 rework [M1]
- CARD-002 — Run lint, typecheck, tests and build on every pull request · delivered 2026-07-18 · PRs #6 (design) + #25 · 191 lines · 1 deliver rework [M1]
- CARD-003 — Publish npm package and GitHub Release on a vX.Y.Z tag · delivered 2026-07-20 · PRs #28 (design) + #39 · 269 lines · 2 implement reworks [M1]
- CARD-019 — Parse card.md frontmatter and body into the card model · delivered 2026-07-18 · PRs #7 (design) + #9 · 601 lines · 1 rework [M2]
- CARD-020 — Record phase-doc presence in the card model · delivered 2026-07-18 · PRs #20 (design) + #24 · 185 lines · 0 reworks [M2]
- CARD-021 — Assemble a board snapshot from cards, config and parse errors · delivered 2026-07-20 · PRs #29 (design) + #45 + #49 (2 slices) · 507 lines · 1 implement + 1 split rework [M2]
- CARD-022 — Add milestone progress to the board snapshot · delivered 2026-07-20 · PRs #52 (design) + #54 · 325 lines · 1 implement rework (CRLF) [M2]
- CARD-006 — Serve the parsed board over HTTP · delivered 2026-07-21 · PRs #56 (design) + #58 + #59 (2 slices) · 679 lines · 1 implement rework · 2 DLV-BODY-TRUE body defects (1 self-fixed, 1 driver-directed) [M2]

## Split
- CARD-004 — Parse a card.md into the card model → split into CARD-019, CARD-020 [M2]
- CARD-005 — Build a board snapshot from the board directory → split into CARD-021, CARD-022 [M2]
- CARD-018 — CLI flags and startup validation → split into CARD-023, CARD-024, CARD-025, CARD-026 [M2]

## Superseded

## Milestones
- M1 — Toolchain and delivery pipeline · 3/3 · complete
- M2 — Headless board API · 5/11 · in progress
- M3 — Live board UI · 0/6 · not started
- M4 — Detail, milestones and activity · 0/3 · not started
