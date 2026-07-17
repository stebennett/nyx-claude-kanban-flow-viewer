# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Pre-implementation. The repository currently contains only the approved design spec —
there is no code, package.json, or build/test tooling yet. **Read the spec first:**
`docs/superpowers/specs/2026-07-17-kanban-flow-viewer-design.md` is the authority on what
is being built; this file only summarizes it. When implementation lands, update this file
with the real build/test/run commands.

## What this project is

`kanban-flow-viewer` — a read-only, live-updating web kanban board for repositories
developed with the nyx-claude `kanban-flow` plugin (https://github.com/stebennett/nyx-claude).
Launched as `npx kanban-flow-viewer <path-to-repo>`; it parses the target repo's board and
serves a local web UI. It never writes to the target repository and never calls GitHub.

## Approved architecture (from the spec)

- TypeScript npm package with two halves: `src/server/` (CLI entry, chokidar watcher,
  card parser, Node HTTP server) and `src/ui/` (React + Vite SPA, pre-built into the
  package at publish time — no build at `npx` time).
- **Source of truth is card frontmatter, not BOARD.md.** Each
  `<repo>/docs/cards/CARD-*/card.md` carries YAML frontmatter (`status`, `phase`,
  `reworks`, `pr_urls`, …) parsed with gray-matter; `BOARD.md` is a rendered view and is
  ignored. `config.md` frontmatter supplies `wip_limit`; `MILESTONES.md` supplies
  milestone grouping.
- Data flow: watcher change (debounced ~200 ms) → full re-parse of every card → complete
  board snapshot pushed over SSE → client re-renders and diffs against the previous
  snapshot to animate moves and build the activity feed. Full snapshots are deliberate:
  the client can never drift from disk. Don't introduce granular/patch events.
- Blocked is a **flag on a card**, not a column: a blocked card renders in its underlying
  phase's column (from `phase` when flow-valued, else inferred from which phase docs
  exist) with a red BLOCKED flag.
- Phase docs for the detail panel are read from the card dir in the primary checkout AND
  from the card's `worktree` path (worktree wins) — most phase docs live on the card's
  branch during flight.
- Testing per spec: Vitest for parser units and React component tests; an integration
  test that runs the real server on a temp fixture board, mutates a card file, and
  asserts the SSE snapshot reflects the move.

## GitHub identity

This repo is enabled for the `github-app-identity` setup: inside it, `gh` and `git push`
act as the **nyxhub-bot** GitHub App (the global gh shim keys on `gh-app.enabled` in git
config; commit identity is `nyxhub-bot[bot]`). A token failure means setup is
incomplete — fix setup, never fall back to personal auth from inside this repo. Remote:
`stebennett/nyx-claude-flow-viewer` (note: name differs from the local directory).

## Workflow

This project follows the superpowers flow: spec → implementation plan
(superpowers:writing-plans) → execution. The spec has been approved; the implementation
plan is the next artifact.
