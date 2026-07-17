# kanban-flow viewer — design

**Date:** 2026-07-17
**Status:** approved

## Purpose

A read-only, live-updating web kanban board for any repository developed with the
[nyx-claude kanban-flow plugin](https://github.com/stebennett/nyx-claude). Launched from
the command line via `npx`, pointed at a project directory; it renders the project's
cards as a kanban board and updates the display whenever card state changes on disk.

### REQ-001 — Never writes to the repository and never calls GitHub
**Status:** active

The viewer never writes to the target repository and never talks to GitHub.

## Source of truth

kanban-flow stores its board under `<repo>/docs/cards/` (the `board_dir` convention):

- `CARD-NNN-slug/card.md` — YAML frontmatter (`id`, `title`, `status`, `phase`, `type`,
  `layer`, `depends_on`, `branch`, `worktree`, `design_pr_url`, `pr_urls`, `split_slices`,
  `reworks`, `estimated_lines`, `actual_lines`, dates) plus a body containing the Why
  paragraph, an acceptance-criteria checkbox list, and Notes. Card state is committed
  directly to main in the primary checkout, so watching this directory sees every move.

`status` values: `backlog`, `slice`, `design`, `implement`, `test`, `review`, `deliver`,
`done`, `blocked`, `split`, `superseded`.

### REQ-002 — Card frontmatter is the source of truth; BOARD.md is ignored
**Status:** active

`BOARD.md` — a rendered view only; the viewer ignores it. **card.md frontmatter is the
source of truth.**

### REQ-003 — `config.md` supplies the board's tunables
**Status:** active

`config.md` — frontmatter with `wip_limit` and other tunables.

### REQ-004 — `MILESTONES.md` supplies milestone grouping
**Status:** active

`MILESTONES.md` — milestone → card grouping.

### REQ-005 — Phase docs are reachable via the card's `worktree`
**Status:** active

Phase docs (`slice.md`, `design.md`, `implement.md`, `test.md`, `review.md`,
`deliver.md`, and `*-check.md`) live beside `card.md`, but during flight most exist only
on the card's branch — reachable via the frontmatter `worktree` path.

## Architecture

### REQ-006 — TypeScript npm package with a server half and a UI half
**Status:** active

npm package **`kanban-flow-viewer`** (TypeScript) with two halves:

- **Server** (`src/server/`): CLI entry, chokidar file watcher, card parser, small Node
  HTTP server exposing the API and serving the pre-built UI bundle.
- **UI** (`src/ui/`): React + Vite single-page app.

### REQ-007 — The UI is built at publish time, not at `npx` time
**Status:** active

The React + Vite single-page app is built at publish time into the package (no build step
at `npx` time).

### REQ-008 — Debounced full re-parse pushed as a full snapshot over SSE
**Status:** active

chokidar watches `board_dir` → on change (debounced ~200 ms) the server re-parses
**everything** from scratch → pushes a **full board snapshot** over Server-Sent Events.
Full snapshots mean the client can never drift from disk; a board of tens of cards makes
the cost negligible.

### REQ-009 — The client renders from the snapshot and diffs against the previous one
**Status:** active

The React client renders from the snapshot and diffs it against the previous one to
animate moves and feed the activity log.

## CLI

### REQ-010 — Launched via `npx` against a repository path
**Status:** active

```
npx kanban-flow-viewer <path-to-repo> [--port 4400] [--board-dir docs/cards] [--no-open]
```

### REQ-011 — `--port`
**Status:** active

`--port` — default 4400; auto-increments if taken.

### REQ-012 — `--board-dir`
**Status:** active

`--board-dir` — repo-relative board location, default `docs/cards`.

### REQ-013 — `--no-open`
**Status:** active

`--no-open` — suppress opening the browser (opens by default).

### REQ-014 — Startup validation
**Status:** active

Startup validation: if `<repo>/<board-dir>` doesn't exist, or contains neither a
`config.md` nor any `CARD-*` directory, exit non-zero with a clear message
("no kanban-flow board found — run /kanban-init?").

## Server

### REQ-015 — `GET /` serves the built React app
**Status:** active

`GET /` — the built React app.

### REQ-016 — `GET /api/board` returns the current snapshot
**Status:** active

`GET /api/board` — current snapshot (JSON).

### REQ-017 — `GET /api/events` streams snapshots over SSE
**Status:** active

`GET /api/events` — SSE stream; emits the full snapshot on every change (and once on
connect).

### REQ-018 — `GET /api/cards/:id/docs` serves phase docs, worktree winning
**Status:** active

`GET /api/cards/:id/docs` — on-demand phase docs for the detail panel. Looks in the
card dir in the primary checkout **and** in the card's `worktree` path (when set and
existing); the worktree copy wins and every doc is labeled with its source.

### REQ-019 — Snapshot shape
**Status:** active

```jsonc
{
  "generatedAt": "ISO timestamp",
  "projectName": "dir basename",
  "config": { "wipLimit": 3 },
  "cards": [ /* parsed card models */ ],
  "milestones": [ { "name": "...", "cardIds": [...], "done": 3, "total": 7 } ],
  "parseErrors": [ { "path": "...", "error": "..." } ]
}
```

### REQ-020 — Card model
**Status:** active

Card model: `id`, `title`, `status`, `phase`, `type`, `layer`, `dependsOn`,
`designPrUrl`, `prUrls`, `splitSlices`, `reworks` (per producer), `estimatedLines`,
`actualLines`, `criteria: { done, total }` (counted from `- [ ]` / `- [x]` items under the
`## Acceptance criteria` heading only),
`blocker` (when present), `created`/`started`/`delivered`, `dirName`.

### REQ-021 — Frontmatter parsed with gray-matter; PR state inferred, never queried
**Status:** active

Parsing uses gray-matter for frontmatter. PR merged-state is **inferred, not queried**:
no GitHub calls, no auth.

### REQ-022 — Split cards display "slice k/N"
**Status:** active

A split card (`split_slices = N ≥ 2`) in `deliver` with k entries in `pr_urls` displays
"slice k/N".

## UI

### REQ-023 — Header
**Status:** active

**Header:** project name · WIP indicator ("WIP 2/3", amber at the limit; "in flight" =
status in slice/design/implement/test/review/deliver, or blocked, vs `wip_limit`) ·
connection dot (live / reconnecting).

### REQ-024 — Eight flow columns
**Status:** active

**Board:** eight flow columns — Backlog, Slice, Design, Implement, Test, Review,
Deliver, Done.

### REQ-025 — Blocked is a flag, not a column
**Status:** active

**Blocked is a flag, not a column.** A blocked card renders in its underlying phase's
column with a red BLOCKED flag and the blocker reason. The column is chosen from the
`phase` field when it holds a flow value; otherwise inferred from which phase docs
exist in the card dir (`deliver.md` → Deliver … `slice.md` → Slice); fallback Backlog.

### REQ-026 — `split` / `superseded` drawer
**Status:** active

`split` / `superseded` cards sit in a collapsed, de-emphasized drawer below the board.

### REQ-027 — Unrecognized status goes to an overflow column
**Status:** active

A card with an unrecognized status renders in a labeled overflow column — never
silently dropped.

### REQ-028 — Card anatomy
**Status:** active

**Card anatomy:** ID badge · title · type + layer badges · `depends_on` chips (grayed
once that dependency is done) · acceptance-criteria progress bar with "3/5" text · PR
chips (design PR + implementation PRs as links; split cards show "slice k/N") · rework
badges shown only when non-zero ("↻2 implement") · red BLOCKED flag + reason when
blocked.

### REQ-029 — Live movement
**Status:** active

**Live movement:** on each snapshot the client diffs against the previous one. A card
whose column changed animates across (FLIP transition) with a brief highlight;
field-only changes highlight in place.

### REQ-030 — Activity feed
**Status:** active

The same diff feeds the **activity feed** — a collapsible right rail of session-observed
events with timestamps ("14:02 CARD-012 implement → test", "14:05 CARD-009 criteria 2/5
→ 3/5"). The feed is per-session and starts empty.

### REQ-031 — Milestones strip
**Status:** active

**Milestones:** a toggleable strip below the board; each milestone shows a completion
bar (done/total cards) and its card IDs, parsed from `MILESTONES.md`.

### REQ-032 — Card detail panel
**Status:** active

**Card detail:** clicking a card opens a side panel with the Why paragraph, the
acceptance-criteria checklist (checked state rendered), Notes, a compact frontmatter
table (branch, worktree, ADRs, estimated vs actual lines, dates), and one tab per phase
doc found (fetched on open via `/api/cards/:id/docs`, rendered as markdown, labeled
main-checkout vs worktree).

## Error handling

- **Bad path / no board dir:** the CLI exits with a clear, actionable message
  (restates REQ-014).
- **Partial / multi-file writes:** the 200 ms debounce plus full re-parse makes races
  self-healing — the next event produces a correct snapshot (restates REQ-008).

### REQ-033 — Malformed `card.md` never crashes the board
**Status:** active

**Malformed card.md:** the card appears in an "unparseable" tray with filename and
error; the board never crashes on one bad file.

### REQ-034 — SSE disconnect recovers automatically
**Status:** active

**SSE disconnect:** `EventSource` auto-reconnects; the client re-syncs on the next
snapshot; the connection dot shows the state.

### REQ-035 — Missing worktree path falls back to the primary checkout
**Status:** active

**Missing worktree path** in the detail view: fall back to the primary checkout copy;
absent docs simply don't get a tab.

## Continuous integration and release

### REQ-036 — Every pull request runs lint, typecheck, tests and build
**Status:** active

Every pull request triggers a CI workflow that runs ESLint, `tsc --noEmit`, the Vitest
suite, and the production build. Any gate failing fails the workflow, so the pull request
reports a red check.

### REQ-037 — Pushing a `vX.Y.Z` tag publishes a release
**Status:** active

Pushing a tag matching `vX.Y.Z` runs a release workflow that verifies the tag matches
`package.json`'s version, builds the package, publishes it to npm with provenance, and
creates a GitHub Release with generated notes. If the tag does not match `package.json`'s
version, the workflow fails without publishing anything. The release workflow runs the
same gates as REQ-036 before publishing.

## Testing

- **Unit (Vitest):** the parser against fixture card files — valid, malformed
  frontmatter, missing fields, criteria counting, milestones parsing, blocked-phase
  inference.
- **Integration:** spin the real server on a temp fixture board; assert `/api/board`;
  mutate a card file on disk and assert the SSE snapshot reflects the move.
- **Component (Vitest + React Testing Library):** board rendering from snapshot
  fixtures; snapshot-diff logic (move detection, activity entries).
- **Manual smoke:** run against a real kanban-flow repo.

## Out of scope (v1)

- Writing to the board, moving cards from the UI, or any GitHub interaction.
- Multi-project dashboards (one directory per viewer instance).
- Historical analytics (cycle time charts, cumulative flow) — the activity feed is
  session-only.
- Authentication — the server binds locally for a single developer.
