---
verdict: pass
criteria: {INT-AC-OBSERVABLE: pass, INT-REQ-RESOLVES: pass, INT-VERTICAL: pass, INT-COVERAGE: pass, INT-NO-OVERLAP: pass, INT-DAG: pass, INT-MILESTONE: pass, INT-SIZED: pass}
---
# Intake check — CI and release pipeline (REQ-036, REQ-037)

Round 1 of 2 (rework re-check). Round 0 returned `fail` on `INT-COVERAGE` with two
advisories; all three were applied. This document supersedes the round-0 report.

## Verdict

**pass** — no blocking findings. The round-0 `INT-COVERAGE` gap is closed by CARD-003
AC-5. One advisory carried forward (a handoff obligation, not a card defect). No card
breaches `size_limit`.

## Criteria

| id | verdict | evidence |
|---|---|---|
| INT-AC-OBSERVABLE | pass | All 14 ACs name a runnable observation. New CARD-003 AC-5 is observable by the same negative-case test as CARD-002 AC-3: push a `vX.Y.Z` tag at a commit carrying a lint error, watch the workflow go red and `npm view` show no new version. CARD-001 AC-3's "at least one real test" remains the softest wording; still watchable, not flagged. |
| INT-REQ-RESOLVES | pass | REQ-006 (spec.md:56) and REQ-007 (spec.md:65) exist, **Status: active**, unsuperseded. Round-0 advisory resolved: REQ-007 now indexed on CARD-001 (`[REQ-006, REQ-007, REQ-036]`) and CARD-003 (`[REQ-007, REQ-037]`), matching the AC citations. REQ-036/037 remain absent from spec.md (ends REQ-035, spec.md:267) — correct at check time per /requirement SKILL.md:87-96 (check at step 5, `req-ids` allocate at step 6.1). |
| INT-VERTICAL | pass | Unchanged from round 0. CARD-002/CARD-003 are each an end-to-end capability with a visible outcome; CARD-001 is `type: task` scaffolding, which INTAKE.md sanctions as "internal scaffolding … no direct user value". AC-5 does not make CARD-003 a layer task — it is still one workflow delivering one outcome. |
| INT-COVERAGE | pass | **14 of 14 behaviours claimed.** REQ-037.7 ("the release workflow runs the same gates as REQ-036 before publishing") is now claimed by CARD-003 AC-5, which enumerates all four of REQ-036's gates (lint, typecheck, test, build) and states the failure semantics ("any gate failing fails the workflow and publishes nothing"). The clause is fully covered, not paraphrased away. |
| INT-NO-OVERLAP | pass | CARD-001 defines the npm scripts; CARD-002 invokes them on `pull_request`; CARD-003 invokes them on tag push. AC-5 does **not** create an overlap with CARD-002 AC-2: the two cards claim gates under different triggers, from different REQs, with different consequences (red check vs. blocked publish). Board is empty. Advisory below is a forward risk, not a present overlap. |
| INT-DAG | pass | Re-walked by hand after change 2: CARD-001 → []; CARD-002 → [CARD-001]; CARD-003 → [CARD-001, CARD-002]. Three edges, one topological order (001, 002, 003), no back edge, acyclic. Every id names a proposed sibling. |
| INT-MILESTONE | pass | M1 `**Cards:**` = CARD-001, CARD-002, CARD-003 — each in exactly one milestone. Board empty (`docs/cards/CARD-*` absent; MILESTONES.md:6-9 is a commented example only), so nothing unplaced. The new 002 → 003 edge is intra-M1 → no later-milestone dependency. No terminal cards. |
| INT-SIZED | pass | CARD-001 ≈ 406 and CARD-002 ≈ 68 stand (cards unchanged; change 3 touches only frontmatter under `docs/cards/**`, which `size_exclude` omits). CARD-003 re-derived with AC-5 at ≈ 110 — within the ≈110 projected in round 0 for exactly this remedy. All under `size_limit` 500. Working in ## Size. |

## Requirement coverage

| # | Behaviour (checker's words, from the REQ text) | Card | AC |
|---|---|---|---|
| REQ-036.1 | A PR against main triggers a CI workflow | CARD-002 | AC-1 |
| REQ-036.2 | It runs ESLint | CARD-002 | AC-2, AC-3 |
| REQ-036.3 | It runs `tsc --noEmit` | CARD-002 | AC-2, AC-3 |
| REQ-036.4 | It runs the Vitest suite | CARD-002 | AC-2, AC-3 |
| REQ-036.5 | It runs the production build | CARD-002 | AC-2, AC-3 |
| REQ-036.6 | Any gate failing fails the workflow → red check on the PR | CARD-002 | AC-3 |
| (enabling) | The gates have something real to run against | CARD-001 | AC-1..5 |
| REQ-037.1 | A `vX.Y.Z` tag triggers the release workflow; other shapes do not | CARD-003 | AC-1 |
| REQ-037.2 | It verifies the tag matches package.json's version | CARD-003 | AC-2 |
| REQ-037.3 | Mismatch → workflow fails, publishes nothing | CARD-003 | AC-2 |
| REQ-037.4 | It builds the package | CARD-003 | AC-3 |
| REQ-037.5 | It publishes to npm with provenance | CARD-003 | AC-3 |
| REQ-037.6 | It creates a GitHub Release with generated notes | CARD-003 | AC-4 |
| REQ-037.7 | The release workflow runs REQ-036's gates before publishing | **CARD-003** | **AC-5 (new)** |

Fourteen of fourteen. The round-0 gap is closed.

## Size

`size_limit`: 500 changed lines including tests. Excluded per `size_exclude`:
`package-lock.json` (material — a real lockfile for this toolchain would otherwise
dominate CARD-001), `node_modules/**`, `vendor/**`, `docs/cards/**` (the cards, their
frontmatter, and this report), the other lock globs.

**Greenfield caveat (`_method.md` appendix):** `Glob` over `package.json`, `tsconfig*.json`,
`vite*.ts`, `vitest*.ts`, `eslint*`, `.github/workflows/*`, `src/**` returns **no files**.
These bounds derive from the acceptance criteria alone; the checker fails only on a breach
of the bound.

### CARD-001 — `estimated_lines: 406` (unchanged, stands)

| file | new/edit | lines | basis |
|---|---|---|---|
| `package.json` | new | 55 | bin, files, scripts, TS+React+Vite+Vitest+ESLint deps (AC-5) |
| `package-lock.json` | new | **excluded** | `size_exclude` |
| `tsconfig.json` + `.server.json` + `.ui.json` | new | 65 | two halves (REQ-006) need Node vs DOM libs |
| `eslint.config.js` | new | 55 | flat config, TS + React plugins (AC-1) |
| `vite.config.ts` | new | 25 | UI build into the package (AC-4) |
| `vitest.config.ts` | new | 20 | AC-3 |
| `.gitignore` | new | 12 | |
| `index.html` | new | 14 | Vite UI entry |
| `src/server/index.ts` | new | 40 | minimal CLI entry (REQ-006) |
| `src/server/<one real module>` | new | 30 | AC-3 needs something real to test |
| `src/ui/main.tsx` | new | 15 | |
| `src/ui/App.tsx` | new | 20 | |
| tests (~2 files) | new | 55 | TDD 1:1 with the module + a UI smoke test (AC-3) |
| **total** | | **406** | range 350–480 |

Change 3 adds `REQ-007` to frontmatter under `docs/cards/**` — excluded, zero effect.

### CARD-002 — `estimated_lines: 68` (unchanged, stands)

| file | new/edit | lines | basis |
|---|---|---|---|
| `.github/workflows/ci.yml` | new | 65 | `pull_request` trigger, checkout, setup-node with cache, `npm ci` (AC-4), four gate steps (AC-2) |
| `README.md` badge | edit | 3 | optional |
| **total** | | **68** | |

### CARD-003 — `estimated_lines: 110` (re-derived for AC-5; was 97)

Both design routes converge, so the estimate is robust to the choice AC-5 defers:

| file | new/edit | lines | basis |
|---|---|---|---|
| `.github/workflows/release.yml` | new | 85 | `push: tags: v*.*.*` (AC-1), tag↔package.json check (AC-2), `permissions: id-token: write` + `contents: write`, build, `npm publish --provenance` (AC-3), `gh release create --generate-notes` (AC-4) |
| *route A* — `release.yml` gates job + `ci.yml` gains `workflow_call:` | new+edit | 5 + 12 | reuse (AC-5) |
| *route B* — four inline gate steps in `release.yml` | new | 15 | duplication (AC-5) |
| **total** | | **≈ 102–110** | recorded as **110**, the conservative arm |

Within the ≈110 projected in round 0 for this exact remedy. Not material; `right_sized:
true` remains defensible at ~22% of budget.

## Advisory findings

**1. `INT-NO-OVERLAP` — forward overlap risk with the follow-on `/refine` run.**
*Location:* CARD-001 (`reqs: [REQ-006, REQ-007, REQ-036]`, "minimal server and UI entry
points"). Carried from round 0, accepted by the coordinator, discharged at handoff rather
than by a card edit. No present overlap; retained so the driver sees the obligation exists.
*Remedy:* hand CARD-001 to the `/refine` run as existing board state; hold its REQ-006
footprint to the bare entry points the gates need.

## Notes for the design phase (not findings)

**The 002 → 003 edge is endorsed, and AC-5 supplies a reason stronger than option value.**
REQ-037.7 says "the **same** gates as REQ-036" — "same" is semantically anchored to
CARD-002's workflow, so REQ-037.7 is only verifiable against a CARD-002 that already
exists. Under route B (inline duplication) the two gate definitions can silently drift,
and REQ-037.7 becomes false without any card failing. `card-designer` should treat route
A (`workflow_call`) as the default and justify route B explicitly if chosen — the edge the
coordinator added is what keeps route A reachable.

## Spec note (not a card finding)

At check time REQ-036/REQ-037 were not yet in `docs/spec.md` (which ended at REQ-035) —
correct per the skill's ordering (check at step 5, `req-ids` allocate at step 6.1). The
checker flagged that ids other than 036/037 would force a rewrite of all three cards'
`reqs`. On write, `req-ids` allocated exactly REQ-036 and REQ-037, so no rewrite was
needed.

## Round history

| round | verdict | blocking | resolution |
|---|---|---|---|
| 0 | fail | INT-COVERAGE — REQ-037.7 unclaimed | CARD-003 AC-5 added; advisories on REQ-007 indexing and /refine handoff both applied |
| 1 | **pass** | none | 1 advisory carried (handoff obligation) |
