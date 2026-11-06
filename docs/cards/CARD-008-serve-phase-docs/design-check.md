---
phase: check
checks: design
card: CARD-008
verdict: pass
criteria:
  DSG-AC-COVERED: pass
  DSG-SPEC-FIDELITY: pass
  DSG-TASK-TDD: pass
  DSG-DOCTRINE: pass
  DSG-ADR-NEEDED: pass
  DSG-KNOWLEDGE: pass
  DSG-SCOPE: pass
  DSG-NO-CODE: pass
---

# CARD-008 design re-check (rework 1) — verdict: pass

## Verdict
**pass.** The single blocking finding from the prior check (`DSG-ADR-NEEDED` / B1 — an ADR asserting a
CARD-023 compatibility CARD-023's own design contradicted) is genuinely fixed: every claim in the
reworked ADR text was traced line-by-line against `.worktrees/CARD-023-cli-board-dir-flag/docs/cards/
CARD-023-cli-board-dir-flag/design.md` and holds. Six advisory findings ride the design PR; none is
blocking. The design PR gate and the human merge are the backstop.

## Criteria
| id | verdict | evidence |
|---|---|---|
| DSG-AC-COVERED | pass | Derived 8 expected tasks from card.md:36-39 before comparing; all four ACs map — AC-1→tasks 1,6,8; AC-2→3,4,5,7; AC-3→1,3,7; AC-4→2,4,5,9. No AC without a task; task 9 covers all three AC-4 shapes (design.md:231-238). |
| DSG-SPEC-FIDELITY | pass | Opened every cited section: spec.md:13-17 (REQ-001), 47-52 (REQ-005, enumerates the doc set + worktree reachability), 123-126 (REQ-016), 134-139 (REQ-018 "on-demand … worktree copy wins … labeled with its source"), 267-271 (REQ-035 fallback, absent docs get no tab). Each says what design.md:304-312 claims; the no-caching exclusion (design.md:45-46) follows REQ-018's "on-demand", contradicting nothing. |
| DSG-TASK-TDD | pass | design.md:161-238 — all 9 tasks are file-level (`phase-docs.test.ts`, `card-model.ts`, `http-server.test.ts`, `tsconfig.test.json` named) and each states failing `it` → run red → implement → green → commit; tasks 6-9 add the test to `http-server.test.ts` before the route branch exists. |
| DSG-DOCTRINE | pass | Rule-by-rule below. Spec-over-training, parallel-derived-values (repoRoot vs boardDir vs repo-relative `card.worktree`; `main-checkout` vs `worktree` source) and determinism (codepoint comparator not `localeCompare`, seed 20260721, `:0` ports, fixed `now`, no network) are all explicitly honoured; numeric precision and as-of semantics are `na` with reasons. |
| DSG-ADR-NEEDED | pass | **B1 re-verified, not accepted on assertion** — see `## B1` below. One ADR proposed (design.md:326-363), recorded in `## Proposed ADRs`; docs/adrs/README.md holds 11 ADRs, none about server path context — it extends ADR-0010, duplicates none, contradicts none (ADR-0010 fixed the `createServer(options): Server` signature, which a new required field does not change). No un-ADR'd expensive decision remains: the response envelope is dictated by REQ-018, not chosen. |
| DSG-KNOWLEDGE | pass | Checked each cited entry against KNOWLEDGE.md: [CARD-019] TS6307 honoured (task 1 edits `tsconfig.test.json`); [CARD-020] tag-based property ground truth honoured (design.md:180-185); [CARD-021] seed pinning, `readdirSync` order → explicit sort, no-path-leak all honoured; [CARD-004]/[CARD-020] "reuse the canonical matcher" honoured by delegating `hasCheckDoc` (parse-card.ts:101-106) rather than duplicating it — the slice's own shape, explicitly rejected at design.md:92-94. Task 2 uses a directory named `review.md` for the unreadable-entry case rather than `chmod 000` ([CARD-021]) — equivalent and simpler. No gotcha re-tread found. |
| DSG-SCOPE | pass | In/out of scope explicit (design.md:33-55). Reverse map: every task serves an AC or a named contract — task 8's 404/500 serves ADR-0010's error contract for a route that must have one, task 1's `parse-card.ts` delegation is ~5 lines mandated by KNOWLEDGE [CARD-004]/[CARD-020]. Nothing outside card.md's four ACs. |
| DSG-NO-CODE | pass | Globbed the branch: `src/server/` holds only the 12 pre-existing files — no `phase-docs.ts`, and `card-model.ts` (66 lines, no `DocSource`/`PhaseDoc`) and `http-server.ts` (39 lines, no `repoRoot`) are untouched. The card dir holds card.md/slice.md/slice-check.md/design.md only; the prior design-check.md is correctly deleted. The ```ts blocks at design.md:99-137 are interface declarations inside the doc, not written files. |

## B1 — is the CARD-023 compatibility claim now true?
Traced against `.worktrees/CARD-023-cli-board-dir-flag/.../design.md`, not accepted on assertion:
1. **`resolve(args.targetRepo)` in scope at the `createServer` call site** — CARD-023:122-124 wires
   `index.ts` as `parseArgs(process.argv.slice(2))` → on `ok`, `resolvePaths(args)` → `createServer({…})`.
   `resolvePaths` takes `args`, so `args` is necessarily in lexical scope in the same branch as the
   `createServer` call, and `CliArgs.targetRepo` exists (CARD-023:96). **True.**
2. **The value is the *same* repo root the board path was resolved against** — CARD-023:128 defines
   `repoRoot = resolve(targetRepo)`, `boardDirPath = resolve(repoRoot, boardDir)`. So
   `path.relative(resolve(args.targetRepo), boardDirPath)` is exactly `CliArgs.boardDir` for a relative
   flag value and `..`-prefixed for an absolute one — which is precisely the derivation at design.md:124
   and precisely the "Harder:" failure mode the ADR documents at design.md:356-361. **Consistent.**
3. **`ResolvedPaths` needs no extending** — CARD-023:104-107 is literally `{boardDirPath, projectName}`.
   The repo root is not in it and is not needed, because (1) puts `targetRepo` at the call site. **True.**
4. **Both merge orders produce correct code** — CARD-023 first: CARD-008 adds one argument
   (`repoRoot: resolve(parsed.args.targetRepo)`) and touches neither `boardDirPath` nor `resolvePaths`,
   so CARD-023's AC-2 (`--board-dir` actually served) cannot regress. CARD-008 first: today's `index.ts`
   already computes `resolve(targetRepo)` inline (index.ts:18), so the field is free; when CARD-023 then
   lands, the *required* field makes its omission a `tsc -b --noEmit` failure — a loud compile error at
   the one shared call site, exactly as the ADR claims. **Neutral in both directions, and the failure
   mode in the worse order is compile-time, never silent.** Residual noted as advisory A6.

Also spot-checked the derivation itself against task 4's hand-written expectations: `/r` + `/r/docs/cards`
+ `.worktrees/CARD-008-x` → `/r/.worktrees/CARD-008-x/docs/cards/CARD-008-x`; `boardDir:'/r/board'` →
`/r/.worktrees/CARD-008-x/board/CARD-008-x`; absolute `'/elsewhere/wt'` → `/elsewhere/wt/docs/cards/
CARD-008-x`. All three match `path.join(path.resolve(repoRoot, worktree), path.relative(repoRoot,
boardDir), dirName)` exactly. The `worktree === ''` case needs the explicit guard the Interfaces jsdoc
names (design.md:118), since `path.resolve(repoRoot,'')` returns `repoRoot`.

## Acceptance criteria → tasks
| card.md AC | design tasks | check |
|---|---|---|
| AC-1 seven doc patterns from the primary checkout | 1 (matcher + labeled read, 8-name list incl. `deliver-check-design.md`), 6 (endpoint 200 + content-type), 8 (404 side) | covered |
| AC-2 worktree read, worktree wins | 3 (merge + property), 4 (worktree dir derivation), 5 (composition), 7 (end-to-end `'WORKTREE design'` wins) | covered |
| AC-3 every doc labeled with its source | 1 (all `main-checkout`), 3 (source on merge), 7 (mixed sources in one response) | covered |
| AC-4 unset/missing worktree falls back, absent docs simply absent | 2 (reader totality), 4 (`worktree:''`), 5 (absent worktree dir), 9 (all three shapes over HTTP) | covered |

Reverse: 1→AC-1/3 · 2→AC-4 · 3→AC-2/3 · 4→AC-2/4 · 5→AC-2/4 · 6→AC-1 · 7→AC-2/3 + REQ-001/ADR-0011 ·
8→ADR-0010 error contract (+ traversal) · 9→AC-4 — no orphan task.

The checker's own pre-comparison task list (matcher; labeled dir read; merge with precedence;
worktree-dir derivation; route + 404; fallback + empty list; UI-importable response type; REQ-001 guard
on the new server tests) maps 1:1 onto the design's nine, with the response type folded into task 1's
implement step.

## Doctrine
- **Spec outranks training** — honoured. Every AC carries a spec line range and all five were opened and
  confirmed. The one place memory would say otherwise (a caching/ETag layer for a docs endpoint) is
  explicitly rejected against REQ-018's "on-demand".
- **Numeric precision** — `na`. Filenames, file text and path strings only; no money, rounding or float
  comparison anywhere in the interfaces or the tests.
- **Parallel derived values** — honoured, and this is the card's central hazard. Three related path
  quantities exist (`repoRoot`, `boardDir`, repo-root-relative `card.worktree`) and the design names
  which one every consumer gets: the Interfaces jsdoc, `ServerOptions.repoRoot`'s comment
  ("`card.worktree` is relative to THIS"), and the ADR's whole Decision paragraph. The same discipline is
  applied to the two doc sets and their `source` labels, with the naive blend pinned as a mutation.
- **As-of semantics** — `na` for dated snapshots. Its deterministic-ordering analogue *is* engaged and
  honoured: docs sorted by name with an explicit codepoint comparator, merge keyed by name with a stated
  precedence rule.
- **Determinism** — honoured, strongly. Fixed `now`; `:0` ephemeral ports; loopback only; servers closed
  in `finally`; tmp dirs swept in `afterEach`; fast-check seed pinned to `20260721`; and the
  `localeCompare` → codepoint decision is made specifically because ICU collation differs between the
  macOS dev box and the ubuntu CI runner, with the residual mutation gap declared honestly rather than
  claimed as covered.
- **Evidence over claims / YAGNI** — honoured. Four alternatives considered with reasons; caching,
  pagination, size caps, markdown parsing and `decodeURIComponent` all excluded with a stated reason; the
  existing guard suite and fixture harness reused rather than rebuilt.

## Blocking findings
None.

## Advisory findings
- **A1 — one of the four named budget cuts is a rate-model artifact.** `design.md:290` attributes a
  15-line reduction (195→180 in `phase-docs.test.ts`) to folding task 4's unset + absolute cases into
  one `it`. Folding two ~4-line assertion cases removes only the `it(...)` boilerplate (~3-4 lines); the
  15 comes from dropping one `it` at the 18.6 lines/`it` rate. Conversely `design.md:291` is
  *conservative*: deleting the standalone REQ-001-guard `it` saves ~19 real lines (a standalone guard
  test needs its own fixture + `withServer` + fetch + wrap ≈ 25; wrapping task 7's existing request
  costs ≈ 6, measured against the real wrap at `http-server.test.ts:197-216`), and task 9's
  three-shapes-in-one-`it` saves ~10 more by sharing one fixture and one `withServer` — against a claimed
  16 for both. Net: the aggregate ~478 survives — an independent bottom-up against the real files lands
  **~468** (card-model 20 · parse-card 5 · phase-docs.ts 70 · http-server.ts 35 · index+tsconfig 4 ·
  phase-docs.test.ts 178 · http-server.test.ts 150), inside slice-check's independently derived 416 raw /
  483 drift-adjusted band. Remedy: keep the number, fix the attribution.
- **A2 — the `repoRoot` *value* has no proof anywhere.** `design.md:238` — task 9's gate list is
  `eslint . / tsc -b --noEmit / npm run build / vitest run --coverage`, with no manual smoke.
  `index.ts` is coverage-excluded ([CARD-001]) and is the only site that *chooses* the value; the
  required field is compiler-enforced for presence, never for correctness, and a wrong expression there
  produces exactly the silent zero-docs failure the ADR exists to prevent. Remedy: add to task 9 the
  smoke CARD-023's task 7 already carries — `node dist/server/index.js <this repo>` then
  `curl -s 127.0.0.1:4400/api/cards/CARD-008/docs` showing a doc with `source:"worktree"`.
- **A3 — a stale illustration in AC-4.** `design.md:29-30` says the "worktree root exists, own card dir
  does not" shape is "true right now of `.worktrees/CARD-023-cli-board-dir-flag`". It is not: that
  worktree's own card dir exists and holds `design.md`, `design-check.md`, `pr-body.md`. The underlying
  shape is real (true from worktree-cut until the first phase doc is persisted), and the fixture at
  `design.md:233-235` genuinely constructs it — it writes
  `.worktrees/CARD-002-second/docs/cards/CARD-001-first/slice.md`, so root and board dir are real while
  `CARD-002-second`'s own dir inside is not. Only the parenthetical example is wrong. Remedy: drop the
  "true right now of…" clause or point it at a freshly cut worktree.
- **A4 — the doc grew; it did not shrink.** `design.md` is **363 lines** against AGENT-PROTOCOL's ≤150
  advisory budget (2.4x), and longer than the 304-line revision it replaces — the rework framing of a cut
  to ~200 does not match the file. Nothing load-bearing was lost: the mutation→break map survives with 13
  rows including the honest `localeCompare` gap, and every task still carries its concrete assertions with
  task numbers that resolve correctly after the fold. Board size is unaffected (`size_exclude` covers
  `docs/cards/**`). Remedy: at the next rework, compress prose rather than adding to it.
- **A5 — the trip-wires are tight and unit-ambiguous.** `design.md:295-296` — "~300 after task 5" is only
  ~6% above that boundary's own ~282 estimate, so ordinary variation trips it; "~500 before task 9" fires
  at the cap itself, when the breach has already happened rather than before it. Also `git diff --stat`
  reports insertions *and* deletions while these estimates count added lines. Remedy: compare
  `git diff --numstat` insertions, and pull the second wire back to ~430 so there is room to act.
- **A6 — CARD-023's approved text will need a one-line deviation in one merge order.** `design.md:138-144`
  and the ADR's Consequences are correct that either order works, but in the CARD-008-first order
  CARD-023's own design literally writes `createServer({boardDir: boardDirPath, projectName})` — no
  `repoRoot` — so its implementer must deviate from its design text (caught by the typecheck gate, not
  silently). Also, if CARD-023 lands first its `index.ts` rewrite likely drops the now-unused
  `import { resolve } from 'node:path'`, which CARD-008 then re-adds; the ~4-line budget covers it.
  Remedy: one sentence in the ADR's Consequences naming that deviation.

## Orchestrator note — A6 applied at ADR persistence
As with CARD-023's ADR-0012, the advisory that concerned text landing permanently on `main` was applied
when routing the ADR: ADR-0013's Consequences now names the CARD-008-first deviation explicitly, so
CARD-023's implementer meets a documented expectation rather than a surprise red typecheck. `design.md`
is left as the producer wrote it. A1-A5 ride the PR for the implementer; **A2 in particular should be
actioned at implement time** — it is the only proof gap for a value the compiler cannot check.
