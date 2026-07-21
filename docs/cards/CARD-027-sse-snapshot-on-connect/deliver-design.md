# CARD-027 — deliver (design PR)

## PR
https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/63 — `CARD-027 — design: SSE endpoint sends the current snapshot on connect`

- Base: `main` · Head: `feature/027-sse-snapshot-on-connect-design`
- Author: `app/nyxhub-bot` (GitHub App identity confirmed, not personal auth)
- Rebase onto `origin/main` was a no-op (already current).

## What shipped
Docs-only, verified against `origin/main` before the push — four files, all under `docs/**`:

| file | role |
|---|---|
| `docs/cards/CARD-027-sse-snapshot-on-connect/design.md` | the design (rework 1) |
| `docs/cards/CARD-027-sse-snapshot-on-connect/design-check.md` | design re-check, verdict pass |
| `docs/cards/CARD-027-sse-snapshot-on-connect/pr-body.md` | the PR body, used verbatim |
| `docs/adrs/0014-sse-transport-contract-snapshot-hub.md` | ADR-0014 |

No `slice.md`/`slice-check.md`: CARD-027 arrived `right_sized: true` from CARD-018's… (CARD-007's) carve
and was never itself sliced — the parent's slice docs are the terminal record in
`docs/cards/CARD-007-sse-live-snapshots/`.

ADR numbering checked against the two sibling design PRs — #61 carries ADR-0012, #62 carries ADR-0013,
this carries ADR-0014. No collision.

## Notes carried into the PR body
- One design rework, on a finding worth remembering: the original AC-2(b) test deep-equalled both
  frames against `buildSnapshot(options)` under a pinned clock, which cannot distinguish a
  per-connection `snapshot()` call from a frame cached once at `createServer` and replayed. The fix
  splits shape (3a) from freshness (3b, call-varying provider).
- ADR-0014 was persisted with the design-check's advisory 1 applied: the design claimed the
  500-contract test guards the branch-scoped catch against CARD-008's handler-wide hoist. It does not —
  that test's provider throws *before* `writeHead`. The ADR now states plainly that the defence is the
  ADR clause plus the merge-order instruction, not a test.
- Size: designer ~276, checker ~328 (using the file's own 24.3 lines-per-test rate) against
  `estimated_lines: 195`. No 500-cap breach; the cut list should be sized off the higher figure.
- Advisory 4 to action at implement time: the `afterEach` server sweep needs its `server.listening`
  predicate named, and the `requestTimeout` probe must inline `createServer` + `listen` because
  `withServer` never exposes the server.
