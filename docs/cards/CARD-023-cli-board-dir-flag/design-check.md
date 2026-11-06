---
phase: check
checks: design
card: CARD-023
verdict: pass
criteria:
  DSG-AC-COVERED: pass
  DSG-SPEC-FIDELITY: pass
  DSG-TASK-TDD: pass
  DSG-DOCTRINE: pass
  DSG-ADR-NEEDED: pass
  DSG-KNOWLEDGE: fail
  DSG-SCOPE: pass
  DSG-NO-CODE: pass
---

# CARD-023 — design check

## Verdict

**pass.** No blocking finding. Seven advisory findings ride the design PR.

`DSG-KNOWLEDGE` verdicts `fail`, whose severity is **advisory** by `checks/design.md` — it does not
gate and must not trigger rework. `PROTOCOL-ADDENDUM.md` defines no `LOCAL-` design criteria
(addendum line 34: "No project-specific criteria yet"), so the plugin's eight ids are the complete set.

Independent derivation first: from `card.md`'s two ACs alone I expected (i) a red unit test + a new
pure `args.ts` for the default, (ii) red tests + parsing for the explicit path, (iii) a path-resolution
unit, (iv) a server-level proof against a **second** fixture board (AC-2 names it), (v) `index.ts`
wiring, and (vi) some way to reach `withServer`, which today is trapped inside `http-server.test.ts`.
The design's seven tasks match that list plus a property task; nothing I expected is missing.

## Criteria

| id | verdict | evidence |
|---|---|---|
| DSG-AC-COVERED | pass | AC-1 → tasks 2 (default unit), 6 (default-serving e2e), 7 (wiring); AC-2 → tasks 3 (token+errors), 5 (resolve), 6 (alt-board e2e), 7. AC-2's intake-mandated second board is honoured (design.md:183-192, one repo/two boards, disjoint CARD-001·wip 2 vs CARD-777·wip 7). Advisory: task 6's config.md fixture literals lack `---` delimiters (design.md:184-185). |
| DSG-SPEC-FIDELITY | pass | All five citations opened, none fabricated: `spec.md:99-102` = REQ-012 "repo-relative board location, default `docs/cards`" ✓; `:87-92` = REQ-010 npx usage line ✓; `:13-16` = REQ-001 never writes/never GitHub ✓; `:109-114` = REQ-014 startup validation (correctly cited as *out* of scope) ✓; `:296-297` = "Integration: spin the real server on a temp fixture board; assert `/api/board`" ✓, which is exactly the justification given for alternative (e). No design statement contradicts these. Advisory on the M2 `--port` interval (design.md:283-285). |
| DSG-TASK-TDD | pass | Tasks are file-level and red-first where code is driven: 2, 3, 5 each write named failing tests then implement. Task 1 is a pure move whose safety net is the 6 existing `http-server.test.ts` tests (verified: 6 `it(`s at lines 75/108/131/144/159/189). Tasks 4 and 6 add tests over already-shipped code, so no red is *possible*; each substitutes a named mutation with pasted failing output — legitimate, and task 6's mutation ("hardcode DEFAULT_BOARD_DIR inside resolvePaths") is precisely the one AC-2's second fixture exists to catch. Task 7 has no unit test because `index.ts` is coverage-excluded (vite.config.ts:16, KNOWLEDGE [CARD-001]) and pastes gates + a manual smoke, matching merged practice. Advisory: task 6 does not say to revert the mutation before committing. |
| DSG-DOCTRINE | pass | Rule-by-rule below. Spec-outranks-training and parallel-derived-values are engaged and honoured; determinism is fully specified; numeric-precision and as-of are `na` with reasons. |
| DSG-ADR-NEEDED | pass | One ADR proposed and, per AGENT-PROTOCOL.md:122-125, durably recorded in the phase doc (`## Proposed ADRs`, design.md:258-285). It is genuinely expensive to reverse: four chained cards extend the module and assert its error strings verbatim. It duplicates no standing ADR (index has none on CLI/args) and contradicts none — I read ADR-0001 (`engines.node >= 20`, confirmed package.json:6-8), ADR-0002 ("`dependencies` stays empty"), ADR-0005 (which *amends* that to "exactly one runtime dependency", so the design's combined "ADR-0002/ADR-0005 … exactly `{gray-matter}`" is accurate, and `test/packaging.test.ts:34` pins it), ADR-0010 and ADR-0011. Two advisories: the unverifiable "Active development" claim, and the "each sibling card is additive" overstatement. |
| DSG-KNOWLEDGE | fail | Heeds four entries explicitly and correctly — [CARD-019] tsconfig.test.json `include` for a new non-test module (design.md:33/142, matches the real include list), [CARD-021] pinned fast-check seed (design.md:165), [CARD-022] literal ground truth so a differential cannot pass vacuously (design.md:168), [CARD-006] `.listen(4400,'127.0.0.1')` loopback form (design.md:124). Misses one directly engaged trap: the [CARD-019]/[CARD-006] `arr[i] ?? fallback` dead-branch cost under `noUncheckedIndexedAccess` (tsconfig.base.json:4) against the 90% branch gate, which an argv token walk (design.md:60-63) invites. Advisory severity only. |
| DSG-SCOPE | pass | `## In scope` (design.md:22-33) and `## Out of scope` (35-46) are explicit and unusually complete (equals-form, short flags, `--` passthrough, absolute-value policing all named out). Tasks → criteria maps cleanly (table below); the only task with no direct AC is task 1, which is prerequisite infrastructure for task 6 — `writeFixtureBoard`/`withServer` currently live at `http-server.test.ts:12-50` and importing them would execute that suite. Advisory on the ~410 vs `estimated_lines: 130` delta. |
| DSG-NO-CODE | pass | Verified on disk, not asserted: the worktree card dir holds `design.md` only; `.worktrees/CARD-023-cli-board-dir-flag/src/server/` contains the same 12 files as `main` (no `args.ts`), and `.worktrees/.../test/` holds the same 5 files (no `board-fixture.ts`). The `## Interfaces` TS block is signatures-only, proposed as task output, not written. |

## Acceptance criteria → tasks

**AC → task** (both ACs covered):

| AC | tasks |
|---|---|
| AC-1 — `--board-dir` defaults to `docs/cards` (REQ-012) | 2 (`DEFAULT_BOARD_DIR` + default-applied unit), 5 (resolve to `<repo>/docs/cards`), 6 (default board served, ids `['CARD-001']`, `not.toContain('CARD-777')`), 7 (index.ts uses it) |
| AC-2 — `--board-dir <path>` parses **and serves** that repo-relative path | 3 (token consumption + five error branches), 5 (relative/absolute/trailing-slash resolution), 6 (alt board served, ids `['CARD-777']`, `wipLimit 7`, `not.toContain('CARD-001')`), 7 |

**Task → AC** (no orphan tasks):

| task | serves |
|---|---|
| 1 — extract `test/board-fixture.ts` | prerequisite for task 6's server-level proof (AC-2); no AC directly |
| 2 — positional + default | AC-1 |
| 3 — `--board-dir` token + errors | AC-2 (error branches are the new module's own contract, not new features) |
| 4 — order-independence + totality properties | AC-2, robustness beyond the AC — the only trimmable task |
| 5 — `resolvePaths` | AC-1 + AC-2 |
| 6 — two-board end-to-end | AC-1 + AC-2 (the AC's verb is "serves") |
| 7 — wire `index.ts` | AC-1 + AC-2 (without it the flag is unreachable from the CLI) |

## Doctrine

- **Spec outranks training — honoured.** Every implemented rule carries a spec line: the default and
  repo-relative semantics to REQ-012 (`spec.md:99-102`), the usage form to REQ-010 (`:87-92`), the
  server-on-a-temp-fixture test shape to `:296-297`. I opened all five ranges; each says what the
  design claims. Nothing is asserted from memory of "how CLIs work".
- **Numeric precision — `na`.** No money, rounding or decimal quantity in this card. The one numeric
  value in the domain (`--port`) is explicitly CARD-025's (design.md:36); `EXIT_USAGE = 64` is an
  integer constant, not arithmetic.
- **Parallel derived values — honoured, and it is the sharpest thing in the design.** The card's two
  related computed quantities are the repo-relative flag value and the absolute served path. The design
  gives them distinct names on distinct types (`CliArgs.boardDir` vs `ResolvedPaths.boardDirPath`,
  design.md:95-107), makes `resolvePaths` the only conversion (design.md:64-66), names which one each
  consumer gets (`ServerOptions.boardDir` requires the absolute one, design.md:51), and pins the
  related `projectName` trap — "basename of the resolved REPO root, never of the board dir" — with both
  a unit assertion (task 5) and a mutation entry (design.md:236-237).
- **As-of semantics — `na`.** No per-record dated figures, no snapshots-over-time, no replay ordering:
  `parseArgs`/`resolvePaths` are pure string/path functions over one argv.
- **Determinism — honoured.** Fixed clock (`FIXED` passed as `now`, task 6), fixed fast-check seed
  (`{seed: 20260721, numRuns: 200}`, design.md:165), ephemeral `:0` ports via `withServer` rather than a
  fixed 4400 that would flake, servers closed in `finally`, tmp dirs removed in
  `afterEach(cleanupFixtures)`, and no network — both new server-level exercises wrap in
  `assertNoNonLoopbackNetwork` and `assertNoRepoWrites` per ADR-0011 (design.md:192-194).
- **Evidence over claims — honoured.** Task 7 enumerates the exact commands to paste
  (`lint`/`typecheck`/`build`/`test` plus a `curl` smoke showing `CARD-777`, and `echo $?` = 64), and
  tasks 4/6 require pasted mutation output rather than a claim of coverage.

## Blocking findings

None.

## Advisory findings

1. **`DSG-KNOWLEDGE` — argv indexing vs the branch-coverage gate** (`design.md:60-63`). The prescribed
   left-to-right token walk under `noUncheckedIndexedAccess: true` (tsconfig.base.json:4) makes every
   `argv[i]`/`argv[i+1]` `string | undefined`; the reflexive `?? ''` guard is an unreachable branch that
   v8 charges against the 90% branch threshold (vite.config.ts:17-22). KNOWLEDGE records this twice
   ([CARD-019] `arr[i] ?? fallback`; [CARD-006] `req.url ?? ''` — "dead code that permanently costs one
   uncovered branch"). *Remedy:* name the iteration form that avoids it in `## Approach`.
2. **`DSG-ADR-NEEDED` — the "Active development" claim is unverified** (`design.md:265-266`). A
   version-sensitive Node stability label is being written permanently into `main`. I could not verify
   it here (no shell/network; `node_modules` absent from both checkouts, so `@types/node` JSDoc was
   unreachable). The decision survives without it. *Remedy:* verify against the Node 20 LTS docs before
   the ADR is persisted, or rest the rejection on the error-contract reason alone.
3. **`DSG-ADR-NEEDED` — the sibling-additivity claim is overstated** (`design.md:279-282`, echoed at
   `:69-72`). True of `args.ts`: I checked CARD-025's ACs and its `port` is a `CliArgs` field, not a
   path, so neither `parseArgs`' nor `resolvePaths`' signature moves — the seam claim holds *for the
   parse surface*. False of the cards: CARD-025 AC-3 (auto-increment on EADDRINUSE, card.md:38) is
   listen-time behaviour barred from `index.ts` by this design's own alternative (c), and CARD-018
   `slice.md:79-80` already budgets `listen-with-retry.ts` (~45) + test (~110) for it; CARD-024 needs
   `validate-board.ts`, CARD-026 `open-browser.ts` (slice.md:70, 88). Task 7's
   `.listen(4400,'127.0.0.1', …)` *is* CARD-025's seam and the design never names it. *Remedy:* scope
   both sentences to the parser and add one clause about the per-sibling module.
4. **`DSG-SCOPE` — ~410 lines against `estimated_lines: 130`** (`design.md:134-206`). Per-file working:
   `args.ts` ~80, `args.test.ts` ~245 (18 named cases + 2 properties + 2 e2e), `test/board-fixture.ts`
   ~55, `http-server.test.ts` ~10 changed, `index.ts` ~20 changed, `tsconfig.test.json` 1. Not creep —
   every task maps to an AC, and the slicer's 130 priced `args.test.ts` at ~70 with no server-level test
   while AC-2 mandates a two-board served proof. The risk is delivery: ~90 lines of margin under
   `size_limit` 500 on a project whose comparable cards ran ~2x their estimate (CARD-006 313→679,
   CARD-019 300→601; slice.md:15-18). *Remedy:* accept explicitly at the gate, or drop task 4 (~30).
5. **`DSG-TASK-TDD` — task 6 does not say to revert its mutation** (`design.md:194-196`). Task 4 says
   "paste the failing output alongside the green one"; task 6 says only "paste the second test failing
   … Commit." *Remedy:* mirror task 4's wording.
6. **`DSG-AC-COVERED` — fixture `config.md` needs frontmatter delimiters** (`design.md:184-185`).
   `'wip_limit: 2'` without `---` gives gray-matter `data = {}`, so `wipLimit` degrades to
   `DEFAULT_WIP_LIMIT = 3` (build-snapshot.ts:24,32-34) and AC-2's wip 2-vs-7 discriminator stops
   discriminating. The neighbouring `'<id CARD-001>'` placeholders suggest shorthand, hence advisory.
   *Remedy:* use the `'---\nwip_limit: 2\n---\n'` form as `http-server.test.ts:77` does.
7. **`DSG-SPEC-FIDELITY` — the M2 `--port` interval** (`design.md:283-285`, `:39`). REQ-010's usage line
   (`spec.md:91`) advertises `[--port 4400] … [--no-open]`; after this card those exit 64 until
   CARD-025/026 land, where today's `index.ts` silently ignores them. Deliberate, test-pinned and
   ADR-recorded, and failing loud beats serving the wrong port — surfaced for the gate, not a defect.

## Orchestrator note — ADR text corrected before persistence

Advisories 2 and 3 both concerned text that would land permanently on `main` as ADR-0012. Both were
applied by the orchestrator when routing the ADR (no rework spent, design.md itself left as the
producer wrote it):

- The unverifiable "marked Active development on the Node 20 baseline" clause was **removed**; the
  rejection of `node:util.parseArgs` now rests solely on the verifiable error-contract reason.
- The additivity claim was **scoped to `args.ts`'s parser surface**, with an explicit clause recording
  that CARD-024/025/026 each additionally introduce their own tested module
  (`validate-board.ts`/`listen-with-retry.ts`/`open-browser.ts`, per CARD-018's `slice.md`), and that
  `index.ts`'s `.listen(4400,'127.0.0.1')` is CARD-025's seam.
