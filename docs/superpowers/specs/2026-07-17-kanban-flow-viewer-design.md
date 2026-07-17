# kanban-flow viewer — design

**Date:** 2026-07-17
**Status:** approved

## Purpose

A read-only, live-updating web kanban board for any repository developed with the
[nyx-claude kanban-flow plugin](https://github.com/stebennett/nyx-claude). Launched from
the command line via `npx`, pointed at a project directory; it renders the project's
cards as a kanban board and updates the display whenever card state changes on disk.

The viewer never writes to the target repository and never talks to GitHub.

## Source of truth

kanban-flow stores its board under `<repo>/docs/cards/` (the `board_dir` convention):

- `CARD-NNN-slug/card.md` — YAML frontmatter (`id`, `title`, `status`, `phase`, `type`,
  `layer`, `depends_on`, `branch`, `worktree`, `design_pr_url`, `pr_urls`, `split_slices`,
  `reworks`, `estimated_lines`, `actual_lines`, dates) plus a body containing the Why
  paragraph, an acceptance-criteria checkbox list, and Notes. Card state is committed
  directly to main in the primary checkout, so watching this directory sees every move.
- `config.md` — frontmatter with `wip_limit` and other tunables.
- `MILESTONES.md` — milestone → card grouping.
- `BOARD.md` — a rendered view only; the viewer ignores it. **card.md frontmatter is the
  source of truth.**
- Phase docs (`slice.md`, `design.md`, `implement.md`, `test.md`, `review.md`,
  `deliver.md`, and `*-check.md`) live beside `card.md`, but during flight most exist only
  on the card's branch — reachable via the frontmatter `worktree` path.

`status` values: `backlog`, `slice`, `design`, `implement`, `test`, `review`, `deliver`,
`done`, `blocked`, `split`, `superseded`.

## Architecture

npm package **`kanban-flow-viewer`** (TypeScript) with two halves:

- **Server** (`src/server/`): CLI entry, chokidar file watcher, card parser, small Node
  HTTP server exposing the API and serving the pre-built UI bundle.
- **UI** (`src/ui/`): React + Vite single-page app, built at publish time into the
  package (no build step at `npx` time).

Data flow: chokidar watches `board_dir` → on change (debounced ~200 ms) the server
re-parses **everything** from scratch → pushes a **full board snapshot** over
Server-Sent Events → the React client renders from the snapshot and diffs it against the
previous one to animate moves and feed the activity log. Full snapshots mean the client
can never drift from disk; a board of tens of cards makes the cost negligible.

## CLI

```
npx kanban-flow-viewer <path-to-repo> [--port 4400] [--board-dir docs/cards] [--no-open]
```

- `--port` — default 4400; auto-increments if taken.
- `--board-dir` — repo-relative board location, default `docs/cards`.
- `--no-open` — suppress opening the browser (opens by default).
- Startup validation: if `<repo>/<board-dir>` doesn't exist, or contains neither a
  `config.md` nor any `CARD-*` directory, exit non-zero with a clear message
  ("no kanban-flow board found — run /kanban-init?").

## Server

Endpoints:

- `GET /` — the built React app.
- `GET /api/board` — current snapshot (JSON).
- `GET /api/events` — SSE stream; emits the full snapshot on every change (and once on
  connect).
- `GET /api/cards/:id/docs` — on-demand phase docs for the detail panel. Looks in the
  card dir in the primary checkout **and** in the card's `worktree` path (when set and
  existing); the worktree copy wins and every doc is labeled with its source.

Snapshot shape:

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

Card model: `id`, `title`, `status`, `phase`, `type`, `layer`, `dependsOn`,
`designPrUrl`, `prUrls`, `splitSlices`, `reworks` (per producer), `estimatedLines`,
`actualLines`, `criteria: { done, total }` (counted from `- [ ]` / `- [x]` in the body),
`blocker` (when present), `created`/`started`/`delivered`, `dirName`.

Parsing uses gray-matter for frontmatter. PR merged-state is **inferred, not queried**:
no GitHub calls, no auth. A split card (`split_slices = N ≥ 2`) in `deliver` with k
entries in `pr_urls` displays "slice k/N".

## UI

**Header:** project name · WIP indicator ("WIP 2/3", amber at the limit, computed as
cards in flight vs `wip_limit`) · connection dot (live / reconnecting).

**Board:** eight flow columns — Backlog, Slice, Design, Implement, Test, Review,
Deliver, Done.

- **Blocked is a flag, not a column.** A blocked card renders in its underlying phase's
  column with a red BLOCKED flag and the blocker reason. The column is chosen from the
  `phase` field when it holds a flow value; otherwise inferred from which phase docs
  exist in the card dir (`deliver.md` → Deliver … `slice.md` → Slice); fallback Backlog.
- `split` / `superseded` cards sit in a collapsed, de-emphasized drawer below the board.
- A card with an unrecognized status renders in a labeled overflow column — never
  silently dropped.

**Card anatomy:** ID badge · title · type + layer badges · `depends_on` chips (grayed
once that dependency is done) · acceptance-criteria progress bar with "3/5" text · PR
chips (design PR + implementation PRs as links; split cards show "slice k/N") · rework
badges shown only when non-zero ("↻2 implement") · red BLOCKED flag + reason when
blocked.

**Live movement:** on each snapshot the client diffs against the previous one. A card
whose column changed animates across (FLIP transition) with a brief highlight;
field-only changes highlight in place. The same diff feeds the **activity feed** — a
collapsible right rail of session-observed events with timestamps
("14:02 CARD-012 implement → test", "14:05 CARD-009 criteria 2/5 → 3/5"). The feed is
per-session and starts empty.

**Milestones:** a toggleable strip below the board; each milestone shows a completion
bar (done/total cards) and its card IDs, parsed from `MILESTONES.md`.

**Card detail:** clicking a card opens a side panel with the Why paragraph, the
acceptance-criteria checklist (checked state rendered), Notes, a compact frontmatter
table (branch, worktree, ADRs, estimated vs actual lines, dates), and one tab per phase
doc found (fetched on open via `/api/cards/:id/docs`, rendered as markdown, labeled
main-checkout vs worktree).

## Error handling

- **Bad path / no board dir:** CLI exits with a clear, actionable message.
- **Malformed card.md:** the card appears in an "unparseable" tray with filename and
  error; the board never crashes on one bad file.
- **Partial / multi-file writes:** the 200 ms debounce plus full re-parse makes races
  self-healing — the next event produces a correct snapshot.
- **SSE disconnect:** `EventSource` auto-reconnects; the client re-syncs on the next
  snapshot; the connection dot shows the state.
- **Missing worktree path** in the detail view: fall back to the primary checkout copy;
  absent docs simply don't get a tab.

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
