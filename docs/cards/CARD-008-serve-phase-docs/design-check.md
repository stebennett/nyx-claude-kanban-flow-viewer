---
phase: check
checks: design
card: CARD-008
verdict: fail
criteria:
  DSG-AC-COVERED: pass
  DSG-SPEC-FIDELITY: pass
  DSG-TASK-TDD: pass
  DSG-DOCTRINE: pass
  DSG-ADR-NEEDED: fail
  DSG-KNOWLEDGE: pass
  DSG-SCOPE: pass
  DSG-NO-CODE: pass
---

# CARD-008 — design check

## Verdict
**fail** — one blocking finding (DSG-ADR-NEEDED). The design is otherwise strong: the central
worktree-path derivation is *correct against the real worktrees on this machine*, every spec
citation is real and says what is claimed, the task list is file-level and TDD-ordered, and the
refactors of merged code are cheap and regression-netted. The blocker is textual and durable: the
proposed ADR — which is written to `docs/adrs/` the moment this check passes — misdescribes how
the concurrently-designed CARD-023 will consume the new required `repoRoot`, in a way that
guarantees rework for whichever card merges second.

## Criteria
| id | verdict | evidence |
|---|---|---|
| DSG-AC-COVERED | pass | Derived 7 expected tasks from card.md:36-39 before reading design.md:143-212 (phase-docs module+test, matcher reuse from card-model, route branch+tests, id→dirName lookup, worktree path resolution needing a repo root, tsconfig.test.json TS6307 edit, REQ-001 guard wrap); all 7 present. Card AC-1→tasks 1,6; AC-2→3,4,5,7; AC-3→1,3,7; AC-4→2,5,9. No AC unmapped. |
| DSG-SPEC-FIDELITY | pass | Opened all five cited ranges. spec.md:13-17 REQ-001 (never writes/never GitHub) ✓; 47-52 REQ-005 (doc set incl. `*-check.md`, reachable via `worktree`) ✓; 123-126 REQ-016 (`GET /api/board`) ✓; 134-139 REQ-018 verbatim "Looks in the card dir in the primary checkout **and** in the card's `worktree` path (when set and existing); the worktree copy wins and every doc is labeled with its source" — exactly design.md:22-25's claim ✓; 267-271 REQ-035 (fall back to primary; absent docs get no tab) ✓. No contradiction found. |
| DSG-TASK-TDD | pass | design.md:143-212 — 9 tasks, each naming files and following failing-`it` → run red → implement → green → commit. Task 1 correctly sequences the `tsconfig.test.json` include ahead of the new module ([CARD-019] TS6307). Task 1's "re-run the **whole** suite" is the right net for the `hasCheckDoc` delegation: verified 36 `it(`s in parse-card.test.ts, of which `derivePhaseDocsPresent` owns 8 direct cases (parse-card.test.ts:418-497) plus a seeded property (500-530) that independently retypes the exact-OR-prefix expression — so the delegation is genuinely covered. |
| DSG-DOCTRINE | pass | Rule-by-rule below. Spec-outranks-training and determinism honoured with named mechanisms; numeric-precision and as-of `na` with evidence; parallel-derived-values honoured by distinct named fields. |
| DSG-ADR-NEEDED | fail | ADR is correctly *proposed* (design.md:280-304) for an expensive-to-reverse shared-contract change, extends ADR-0010 (verified: ADR-0010 anticipates "CARD-007/008/009 add branches to the same dispatch"), supersedes nothing, duplicates nothing in docs/adrs/README.md's 11-row index. But its Consequences (design.md:294-295) and design.md:47-48 assert a CARD-023 compatibility that CARD-023's own design contradicts — see Blocking finding B1. |
| DSG-KNOWLEDGE | pass | Engages and honours [CARD-019] TS6307 (task 1), [CARD-020] tag-derived property ground truth (design.md:165-167), [CARD-020→CARD-011] dependency-free `card-model.ts` (design.md:92-93), [CARD-021] pinned fast-check seed + no-path-leak assertion (design.md:167, 210-211), [CARD-020]'s exact-vs-prefix check-doc rule. Re-treads no recorded gotcha. |
| DSG-SCOPE | pass | In/out of scope explicit at design.md:32-48. Every task maps back to an AC or to ADR-0010's fixed error contract: task 8's 404/500 branches are required by ADR-0010 ("everything else → 404 … any handler throw → 500"), not scope creep. The two refactors of merged code (`hasCheckDoc` delegation, `try/catch` hoist) are both justified in-scope and both land under existing regression tests. |
| DSG-NO-CODE | pass | `.worktrees/CARD-008-serve-phase-docs/src/server/` holds exactly the 12 files already on main — no `phase-docs.ts`. Grep for `repoRoot\|phase-docs\|isPhaseDocName\|isCheckDocName` across that worktree's `src/` returns 0 matches; its `tsconfig.test.json` is unmodified. Docs-only branch. |

## Acceptance criteria → tasks

**Criteria → tasks (every card AC has at least one task):**
| card.md AC | design AC | tasks |
|---|---|---|
| AC-1 — seven doc patterns from the primary card dir (REQ-005/018) | AC-1 (design.md:10-15) | 1 (matcher + `readDocsFromDir`), 6 (endpoint 200 + content-type) |
| AC-2 — also read from `worktree`, worktree wins (REQ-005/018) | AC-2 (16-21) | 3 (`mergeDocs`), 4 (`resolveCardDocDirs`), 5 (`readPhaseDocs`), 7 (endpoint merge) |
| AC-3 — every doc labeled with its source (REQ-018) | AC-3 (22-25) | 1 (`'main-checkout'` labels), 3 (label survives merge), 7 (mixed-source assertion) |
| AC-4 — unset/missing worktree falls back silently; absent docs not returned (REQ-035) | AC-4 (26-30) | 2 (`readDocsFromDir` totality), 5 (composition fallback), 9 (endpoint, both shapes) |

**Tasks → criteria (no orphan task):**
1→AC-1/AC-3 · 2→AC-4 · 3→AC-2/AC-3 · 4→AC-2 · 5→AC-2/AC-4 · 6→AC-1 (+ `repoRoot` plumbing for AC-2)
· 7→AC-2/AC-3 · 8→ADR-0010's 404/500 contract (a route must answer a miss; not scope creep)
· 9→AC-4 + REQ-001/ADR-0011, which card.md's Notes explicitly routes to the suite-wide guard.

## Doctrine
- **Spec outranks training** — *honoured.* Every rule the design implements is anchored to an
  opened spec line, not memory: the doc-set enumeration to REQ-005 (spec.md:47-52), worktree-wins
  + source labelling to REQ-018 (134-139), silent fallback to REQ-035 (267-271), on-demand (and
  therefore "no caching", design.md:44-45) to REQ-018's word "on-demand". I re-read all five
  ranges; none is paraphrased inaccurately. The design also refuses the tempting
  memory-driven design (read docs into the snapshot) *because* REQ-019's snapshot shape
  doesn't carry them (design.md:78-80).
- **Numeric precision** — `na`. No money, decimal, or rounding value appears anywhere in the
  card's domain: the response contract is `{name: string, content: string, source: enum}`
  (design.md:95), and the only arithmetic is array indexing.
- **Parallel derived values, never blended** — *honoured, and it is the card's central risk.*
  Three pairs of related-but-distinct quantities exist here and each is given its own name and
  an explicit statement of which consumer gets which: (a) `repoRoot` vs `boardDir` on
  `ServerOptions` (design.md:122-128), with the ADR stating plainly that `card.worktree` is
  relative to the *former* — the blending of these two is exactly the silent bug the ADR exists
  to prevent; (b) `CardDocDirs.primary` vs `.worktree` as separate fields rather than one
  array (design.md:106); (c) the two contents for a colliding filename, disambiguated in the
  payload itself by `source` rather than left implicit. Task 4's assertion
  `not.toContain('cards/.worktrees')` (design.md:173) is a direct test *for* the blend.
- **As-of semantics** — `na`. There are no per-record dated figures and no reference-data
  snapshot: docs are read from disk per request (design.md:44-45 explicitly rejects caching,
  ETag and any stored copy), so no "as-of" divergence can arise. Ordering is by name, not by date.
- **Determinism** — *honoured, well.* design.md:253-254 names fixed `now`, ephemeral `:0` port,
  loopback only, servers closed in `finally`, tmp dirs removed in `afterEach`, a pinned
  fast-check seed (`20260721`, per [CARD-021]) and no network. Beyond the checklist, the design
  applies the rule where it actually bites: `mergeDocs` sorts with a **codepoint** comparator
  rather than `localeCompare` "whose order is ICU-dependent" (design.md:69) — an ordering that
  could differ between a macOS dev box and the ubuntu CI runner. It then declares honestly that
  this specific mutation is *not* covered by a test (design.md:246-247) rather than claiming a
  net it doesn't have.

## Blocking findings

**B1 · DSG-ADR-NEEDED · `design.md:294-295` (also `47-48`, `130-131`)** — the proposed ADR
misdescribes CARD-023, the sibling it will collide with.

CARD-023 (`feature/023-cli-board-dir-flag-design`, in flight) rewrites the same `index.ts` and the
same `createServer` call site. Reading its design:
- `ResolvedPaths` is `{ boardDirPath: string; projectName: string }` — **no `repoRoot`**
  (CARD-023 design.md:104-107). It computes `repoRoot = resolve(targetRepo)` inside `resolvePaths`
  and discards it (CARD-023 design.md:128).
- Its `index.ts` wiring is `createServer({boardDir: boardDirPath, projectName})` (CARD-023
  design.md:122-124) — `argv[2]` and `resolve(targetRepo,'docs/cards')` are both deleted.

Against that, three statements in this design are false:
1. design.md:294-295 — "`index.ts` supplies `repoRoot = resolve(argv[2])` and `boardDir =
   resolve(repoRoot,'docs/cards')`; **CARD-023 changes only the second expression**." It changes
   both, and removes `argv[2]`.
2. design.md:47-48 — "this card introduces only the `repoRoot` option field **CARD-023 will
   populate**." As designed, CARD-023 cannot populate it: the value never leaves `resolvePaths`.
3. design.md:130-131 prescribes the literal pre-CARD-023 `index.ts` body, which re-hardcodes
   `docs/cards` — applying it on top of a merged CARD-023 regresses CARD-023's AC-2.

Neither ordering is free: **CARD-008 first** → CARD-023's designed `createServer` call misses a
required field and reddens `tsc -b --noEmit`, with no designed source for the value. **CARD-023
first** → CARD-008's implementer must extend `ResolvedPaths` (or recompute the root) at
implementation time, a shared-contract decision with no design cover. One of the two designs must
change; the cheap change is this one's text, because the *decision* is right — a required
`repoRoot` genuinely does beat an optional field defaulting to `resolve(boardDir,'..','..')`,
which would re-encode the very assumption CARD-023 breaks.

**Remedy:** rewrite the ADR Consequences and design.md:47-48 to state the reconciliation accurately
and merge-order-tolerantly: `ServerOptions.repoRoot` is required; whichever of CARD-008/CARD-023
merges second supplies it; CARD-023 must add `repoRoot: string` to `ResolvedPaths` (it already
computes `resolve(args.targetRepo)` internally) **or** the `createServer` call site passes
`resolve(args.targetRepo)` directly. Replace the literal index.ts snippet at design.md:130-131 with
a merge-order-neutral instruction ("index.ts passes the already-resolved repo root, whatever
expression yields it at merge time — do not reintroduce a hardcoded `docs/cards`"). Delete
"CARD-023 changes only the second expression".

## Advisory findings

- **A1 · `design.md:303-304`** — the ADR's escape clause for the derivation's known weakness is
  "accepted and out of contract (**CARD-023's flag is repo-relative**)". CARD-023 explicitly
  accepts an *absolute* `--board-dir` and pins it with a test: "an absolute `--board-dir` value
  resolves to itself" (CARD-023 design.md:42-44, 180-181). With an absolute board dir,
  `path.relative(repoRoot, boardDir)` is `..`-prefixed and the worktree derivation resolves
  outside the worktree — degrading, silently, to primary-only docs. It fails safe (ENOENT → `[]`),
  which is why this is advisory and not blocking, but the ADR's stated reason for accepting it is
  factually wrong. Restate the consequence on its own terms without leaning on CARD-023.
- **A2 · `design.md:51-53`, `184-186`** — the harness premise is about to go stale.
  `writeFixtureBoard`/`withServer` are private to `http-server.test.ts` today (verified:
  http-server.test.ts:12 and :35), and the design makes that privacy the *reason* the endpoint
  tests live in that file. CARD-023's task 1 moves both into `test/board-fixture.ts` and renames
  `writeFixtureBoard` → `writeFixtureTree` (CARD-023 design.md:29-32, 135-141). CARD-027
  (also in flight) additionally edits `withServer`'s `finally` and adds five more `ServerOptions`
  literals. The adaptation is mechanical (import + rename), but the *stated rationale* becomes
  false and the "six existing options literals" (design.md:189, verified accurate:
  http-server.test.ts:82, 115, 133, 146, ~160, 195) will be more than six by implementation time.
  Note CARD-027 chose an **optional** `hub?` for the same `ServerOptions` (CARD-027 design.md:33,
  162-170) — worth one sentence engaging with why `repoRoot` is different.
- **A3 · `design.md:255-259` — the ~455 budget is roughly 60 lines light; expect ~516.**
  Re-derived bottom-up against real line counts (`card-model.ts` 75, `parse-card.ts` 158,
  `http-server.ts` 45, `http-server.test.ts` 218/6 `it`s, `parse-card.test.ts` 554/36,
  `build-snapshot.test.ts` 447/24, `milestones.ts` 72):

  | file | design | checker | basis |
  |---|---|---|---|
  | `card-model.ts` | +20 | 18 | 3 type decls + 2 jsdoc'd predicates |
  | `parse-card.ts` | +5 | 5 | import + 3-line body swap |
  | `phase-docs.ts` | 72 | 85 | 4 exported fns + interface + 2 `try/catch` + jsdoc density; comparators `milestones.ts` 72, `build-snapshot.ts` 103 |
  | `http-server.ts` | +30 | 33 | +field, +2 imports, +regex, ~14 branch, ~6 restructured `try/catch`, jsdoc |
  | `index.ts` | +2 | 3 | more if CARD-023 lands first |
  | `tsconfig.test.json` | +1 | 1 | |
  | `phase-docs.test.ts` | 165 | 195 | 9 `it`s at the fs-fixture rate (18.6 lines/`it`) = 167, + mkdtemp helper/afterEach/imports ~28; the tag-derived property alone ~30 |
  | `http-server.test.ts` | 160 | 176 | 6 new `it`s at the file's own body rate ((218−72)/6 = 24.3), heavier here (two-checkout fixture, double guard wrap ≈ 28 each) + 6 literal edits |
  | **total** | **455** | **~516** | |

  Note also that `slice.md:61-63`'s calibration cited `parse-card.test.ts` at 458 and
  `build-snapshot.test.ts` at 362; the real files are **554** and **447**, so the "comparable test
  files are bigger modules" argument that justified ~160-165 rests on undercounted comparators.
  ~516 breaches `size_limit: 500` by ~3% before any drift; at the slice's own corrected 1.16x it
  is ~600, and this repo has twice run ~2x (CARD-006 313→679, CARD-019 300→601). The design's
  pre-authorised cut (task 4's absolute-worktree case, ~12 lines) does not cover a ~60-line gap.
  Suggested split boundary, named now rather than invented under pressure: **tasks 1-5**
  (`phase-docs.ts` + `card-model.ts` matchers + unit tests, ~300 lines) are a self-contained
  pure/fs module with no consumer — the exact [CARD-021] lead-slice shape — and **tasks 6-9** are
  the endpoint wiring.
- **A4 · `design.md:30`, `225`** — AC-4's clause "A card dir with no phase docs at all returns
  `200 {docs:[]}`" and the matching test-strategy line have no owning task; tasks 6/9 both use
  fixtures that do contain docs. One extra assertion in task 9 closes it.
- **A5 · `design.md:205-207`** — the *realistic* worktree-miss shape is never exercised
  end-to-end. Task 9 uses `worktree: .worktrees/gone` (worktree **root** absent). The common
  production shape is a worktree root that exists while the card dir inside it does not, because
  a design-phase worktree is cut from `origin/main`. That is not hypothetical: on this machine
  `.worktrees/CARD-023-cli-board-dir-flag/docs/cards/CARD-023-cli-board-dir-flag/` contains
  **only `design.md` and no `card.md`**, proving the checkout was cut before that card.md reached
  main — so the dir-absent window is the normal state, not an exotic one. The code path is
  identical (`readdirSync` → ENOENT → `[]`, covered by task 2), which is why this is advisory;
  but the endpoint fixture would be more honest as a worktree root that exists *without* the card
  dir.
- **A6 · `design.md:14`, `99-100`** — verified: `deliver-check-design.md` is a real filename in
  this repo (8 occurrences: CARD-001/002/003/006/019/020/021/022), so the claim that a literal
  `*-check.md` glob would miss it is true. But the corollary of [CARD-020]'s exact-`<phase>.md`
  rule is that `deliver-1.md` / `deliver-2.md` — also real here (CARD-006, CARD-021, from split
  slices) — are **not** served, while their `deliver-check-1.md` / `deliver-check-2.md` **are**.
  The detail panel will show a check-doc tab whose subject doc is missing. The design is faithful
  to card.md:36's deliberate enumeration, so this is not a design defect; flagging it so the
  asymmetry is a known product decision rather than a surprise in CARD-016.
- **A7 · `design.md:1-304`** — 304 lines against the ≤150 `design.md` budget
  (AGENT-PROTOCOL.md:100). Advisory by the protocol's own terms. The density is mostly earned (the
  mutation→break map and per-task assertions are the good kind of length), but the Alternatives and
  Test-strategy sections restate material already in the task list.

## What the checker verified on disk (not taken from the design)
- **The central path claim is correct.** Real data: `repoRoot =
  /Users/stevebennett/Code/nyx-claude-kanban-flow-viewer`, `boardDir = <repoRoot>/docs/cards`,
  `card.worktree = .worktrees/CARD-023-cli-board-dir-flag`, `dirName = CARD-023-cli-board-dir-flag`.
  The design's derivation `join(resolve(repoRoot, worktree), relative(repoRoot, boardDir), dirName)`
  yields `<repoRoot>/.worktrees/CARD-023-cli-board-dir-flag/docs/cards/CARD-023-cli-board-dir-flag`,
  which **exists and holds `design.md`**. The primary dir holds only `card.md`. So the endpoint
  would return exactly `[design.md (worktree)]` — the correct real-world answer, and precisely the
  REQ-005 case. The naive `join(boardDir, worktree, dirName)` would produce `docs/cards/.worktrees/…`
  and return nothing. The "a git worktree is a full checkout" premise holds on both live worktrees.
- **The `hasCheckDoc` delegation is behaviour-preserving.** Current `parse-card.ts:101-106` is
  `names.has(`${phase}-check.md`) || [...names].some(n => n.startsWith(`${phase}-check-`) &&
  n.endsWith('.md'))`; the proposed `[...names].some(n => isCheckDocName(phase, n))` with
  `isCheckDocName` = `n === exact || (prefix && suffix)` is semantically identical for a string Set.
  Cost is ~+18 in `card-model.ts` and a net *reduction* in `parse-card.ts` — the "~+15 net" claim
  (design.md:85) is if anything conservative.
