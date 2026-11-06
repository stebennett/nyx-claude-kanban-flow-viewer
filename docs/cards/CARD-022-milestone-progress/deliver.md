## PR
https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/54

## Commit/changelog
- Branch: `task/022-milestone-progress` (rebased clean on `origin/main`).
- New `src/server/milestones.ts` (dependency-free — `parseMilestones` + `deriveMilestones`);
  `MilestoneProgress` type + `milestones` field on `BoardSnapshot` in `card-model.ts`;
  `readMilestonesRaw` + wiring in `build-snapshot.ts`; `tsconfig.test.json` include.
- Tests: `milestones.test.ts` (12) + updated `build-snapshot.test.ts`.
- ~325 changed lines; **no split** (`split_slices: 0`).
- Gates green: lint, `tsc -b --noEmit`, build, 105/105 tests, 100% coverage on `milestones.ts`.
- Review: full 8-lens panel pass (advisories only); a CRLF blocker was found and fixed in one rework.

## Post-merge
On merge, CARD-022 → done; the board snapshot now carries per-milestone `done`/`total`. Consumed by
CARD-006 (UI milestones strip, REQ-031).
