# Protocol Addendum (project-specific)

Project-specific doctrine that layers **on top of** the plugin's `AGENT-PROTOCOL.md`.
Every phase agent reads the plugin protocol first, then this file. Rules here refine
or add to the shared contract for **this repository only** — they never override the
structured-return format or the sole-writer invariant.

`/retro` appends project-specific process lessons here, each prefixed
`[retro-YYYY-MM-DD]`. Universal lessons belong in the plugin instead — `/retro`
flags those as a plugin PR rather than writing them here.

**Size budget:** this file rides every dispatch — keep it under 4 KB; one line per rule.

- `main` is protected by a `branch-guard` hook: **nothing** is pushed to `main` — every change reaches it via a PR.
- **Board bookkeeping ships via PR too** (overrides kanban SKILL.md §5 step 5's direct-to-`main` state commits): `/kanban` still commits `BOARD.md`/`card.md`/`KNOWLEDGE.md`/deliver-check docs to the **local** `main` — the primary checkout's working tree is what §0 reconcile reads and must stay current — then branches that tip (`chore/kanban-board-state`), pushes the branch, and opens a PR. One PR per pump, not per transition.
- Consequence to keep surfacing in the report: each pump's bookkeeping now waits on a human merge, which the direct-to-`main` rule exists to avoid. Local disk stays authoritative; `origin`'s board lags until merged.
- The same hook also blocks `git push origin --delete <branch>` (false positive — deleting a merged feature branch is not a push to `main`), so merged remote branches accumulate; leave them and note them.
- Agents: never push `main`, never `git push origin main`. Push only your own card branch. `card-deliverer` opens PRs; no other agent touches GitHub.

## Check criteria

Project-specific check criteria, layered on top of the plugin's `checks/` doctrine.
Each checker reads its own target's section here in addition to the plugin's.

Criteria here carry a **`LOCAL-`** id prefix so they never collide with a plugin id
and `/retro` can tell which set a verdict came from. Ids are stable and permanent —
never renamed, never reused. `/retro` owns this section; it may add, edit and prune
`LOCAL-` criteria, but never touches the plugin's.

Add a `## Check criteria — <target>` subsection (`target` ∈ `intake` | `slice` |
`design` | `split` | `deliver`) when a lesson earns one. Format matches the plugin file: a
table of `| id | criterion | severity when failed |`.

<!-- No project-specific criteria yet. -->
