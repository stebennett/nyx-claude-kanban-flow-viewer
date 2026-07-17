---
verdict: pass
criteria: {INT-AC-OBSERVABLE: pass, INT-REQ-RESOLVES: pass, INT-VERTICAL: pass, INT-COVERAGE: pass, INT-NO-OVERLAP: pass, INT-DAG: pass, INT-MILESTONE: pass, INT-SIZED: pass}
---
# Intake check — viewer backlog (REQ-001..REQ-035)

Round 1 of 2 (rework re-check). Round 0 returned `fail` on `INT-COVERAGE` and `INT-SIZED`
with eight advisories; both blocking findings and every advisory were applied. **This
document supersedes the round-0 report.** Proposal: CARD-004..CARD-018 (15 cards) plus
milestones M2-M4, against an existing board of CARD-001/002/003 in M1. Checked against
`docs/spec.md` REQ-001..REQ-035; REQ-036/REQ-037 are out of scope and carried by
CARD-002/CARD-003.

## Verdict

**pass** — no blocking findings. Both round-0 blockers are closed: CARD-004 AC-6 gives
REQ-025's inference a data source, and the CARD-006/CARD-018 split puts every card under
`size_limit`. Three advisories, none a card defect: two are corrections to the checker's own
round-0 arithmetic and prose, and one answers the coordinator's REQ-006 question by
extending the index to two more cards. All three were applied before the cards were written.

The set is sound. Eighteen cards, twenty edges, four milestones, both milestone invariants
holding, every `reqs` id resolving, no card over 500, and the CARD-001 handoff obligation
discharged.

## Criteria

| id | verdict | evidence |
|---|---|---|
| INT-AC-OBSERVABLE | pass | 53 ACs across 15 cards, all naming a runnable observation. New CARD-004 AC-6 is observable and sharp: build a fixture card dir containing `deliver.md` + `design-check.md`, assert the model lists both; a dir with none yields empty. New CARD-018's four ACs are each a CLI invocation with a watchable result (occupy 4400 → assert 4401; `--board-dir <path>` against a second fixture board → assert its cards; `--no-open` → assert no `open()`; board-less dir → assert exit code + message). New CARD-006's two ACs are integration-shaped and observable (curl `/api/board`; tree-hash + socket assertions). The two softest from round 0 (CARD-013 AC-1's mechanism wording, CARD-006's for-all negative) remain redeemed by the spec's Testing section and by a tree-hash test respectively. |
| INT-REQ-RESOLVES | pass | All 37 `reqs` ids across CARD-004..CARD-018 resolve in `docs/spec.md` and every one is **Status: active**; none superseded. New ids checked individually: REQ-025 on CARD-004 (active), REQ-006 on CARD-006 and CARD-009 (active). The REQ-006 additions break round 0's "every `reqs` id has an AC citation" pattern — deliberately and legitimately; see ## Note on reqs-as-index. |
| INT-VERTICAL | pass | The split preserves verticality on both children: CARD-006 is user-reachable (`npx … <repo>` → a served snapshot) and CARD-018 is user-reachable (each flag is a CLI behaviour a user invokes and watches), so neither is a horizontal layer task and both are independently shippable. CARD-004/CARD-005 remain `type: task` domain cards, sanctioned by INTAKE.md:25 and precedent-consistent with CARD-001; CARD-004 AC-6 adds a field to the same model, not a new layer. Chain to first user value is still three (004→005→006), unchanged. Folding 004+005+006 would total ~1,263 lines — a 2.5x breach whose only natural split lines are parser / snapshot / server, i.e. the proposal's own shape. |
| INT-COVERAGE | **pass** (was fail) | **Round-0 blocker closed.** REQ-025.3 ("inferred from which phase docs exist") now has a producer: CARD-004 AC-6 records the fact in the card model, CARD-005 AC-1 carries the model into the snapshot's `cards`, and CARD-011 AC-2 consumes it — reachable transitively (011→010→009→006→005→004), so CARD-011's `depends_on` needed no change. **The split loses nothing:** CARD-006{001,010,016} ∪ CARD-018{011,012,013,014} = exactly the seven REQs the unsplit card carried. All three round-0 AC thinnesses closed. 35 of 35 REQs claimed. |
| INT-NO-OVERLAP | pass | The two new seams are clean. **CARD-004 AC-6 vs CARD-011 AC-2:** CARD-004 claims *recording which docs exist* (a readdir, asserted against the model); CARD-011 claims *choosing the column and rendering the flag* (asserted against the DOM). **CARD-006 vs CARD-018:** disjoint `reqs`, disjoint ACs, one shared file (`cli.ts`) serialized by 018→006. REQ-006 indexed on multiple cards is not overlap — `reqs` is an index, not a claim. REQ-033 across CARD-005 (JSON) and CARD-017 (DOM) is a legitimate layer split across M2/M3. REQ-028's trailing blocked clause is correctly abstained by CARD-010 and claimed once by CARD-011 via REQ-025. The CARD-010/CARD-011 `Card.tsx` collision is resolved by the new 011→010 edge. |
| INT-DAG | pass | Re-walked by hand across all 18 nodes and **20 edges** (was 18; +018→006, +011→010): 001→[]; 002→[001]; 003→[001,002]; 004→[001]; 005→[004]; 006→[005]; 007→[006]; 008→[006]; 009→[006]; 010→[009]; 011→[009,010]; 012→[009,007]; 013→[012]; 014→[013]; 015→[009]; 016→[009,008]; 017→[009]; 018→[006]. Every id names a real card (001-003) or a proposed sibling. **Every edge points from a higher id to a lower one** — including both new ones — so the id order 001..018 is a topological order and a cycle is impossible. Acyclic. |
| INT-MILESTONE | pass | **Coverage:** M1{001,002,003}=3 + M2{004,005,006,018,007,008}=6 + M3{009,010,011,012,013,017}=6 + M4{014,015,016}=3 = **18**; every live card exactly once, none orphaned, none doubled. No terminal cards (all 18 `backlog`), so INTAKE.md's terminal-card rule is not engaged. **Dependency consistency:** all 20 edges walked — both new edges are intra-milestone (018→006 within M2; 011→010 within M3), and every other edge lands same-or-earlier (004→001 M2→M1; 009→006 M3→M2; 012→007 M3→M2; 014→013 M4→M3; 016→008 M4→M2). No later-milestone dependency. M2/M3/M4 now carry observable `**Exit criteria:**`. |
| INT-SIZED | **pass** (was fail) | **Round-0 blocker closed.** CARD-006's 528 is gone; the children re-derive at **313** and **305**. No card in the set breaches `size_limit` 500. Three estimates corrected against the checker's own round-0 sketches (CARD-004 393 not 365; CARD-006 313 not 300; CARD-018 305 not 250) — advisory 1, data quality not a gate. The other 12 stand. **All 15 carry `right_sized: ""`**, so no card skips the slice phase. Working in ## Size. |

## Requirement coverage

Behaviours derived from spec.md in round 0 before reading any proposal. 35 REQs → 15 cards.
Rows changed in round 1 are marked **Δ**.

| REQ | Behaviour (checker's words) | Card | AC |
|---|---|---|---|
| 001.1 | Never writes to the target repository | CARD-006 | AC-2 **Δ** |
| 001.2 | Never calls GitHub | CARD-006 | AC-2 **Δ** |
| 002.1 | Card model built from card.md frontmatter | CARD-004 | AC-1, AC-4 |
| 002.2 | BOARD.md is ignored | CARD-004 | AC-4 |
| 003 | `config.wipLimit` from config.md frontmatter | CARD-005 | AC-2 |
| 004 | Milestone→card grouping from MILESTONES.md | CARD-005 | AC-3 |
| 005 | Phase docs reachable via the `worktree` path | CARD-008 | AC-2 (enumerated in AC-1 **Δ**) |
| 006 | TS package, server half + UI half | **CARD-001** (existing); indexed on CARD-004, CARD-006, CARD-007, CARD-009 **Δ** | AC-4, AC-5 |
| 007 | UI built at publish time, not npx time | **CARD-001** (existing); **CARD-003** | AC-4, AC-5 |
| 008.1 | chokidar watches board_dir → full re-parse | CARD-007 | AC-2 |
| 008.2 | Debounced ~200 ms; a burst yields one snapshot | CARD-007 | AC-3 |
| 008.3 | Full snapshot pushed over SSE | CARD-007 | AC-2 |
| 009 | Client renders from snapshot, diffs against previous | CARD-012 AC-2; CARD-013 | AC-1 |
| 010 | `npx kanban-flow-viewer <repo>` launches it | CARD-006 | AC-1 **Δ** |
| 011 | `--port` default 4400, auto-increments if taken | **CARD-018** | AC-1 **Δ** |
| 012 | `--board-dir`, default `docs/cards`, honoured when set | **CARD-018** | AC-2 **Δ** |
| 013 | `--no-open` suppresses; opens by default | **CARD-018** | AC-3 **Δ** |
| 014 | Missing/invalid board dir → non-zero + message | **CARD-018** | AC-4 **Δ** |
| 015 | `GET /` serves the built React app | CARD-009 | AC-1 |
| 016 | `GET /api/board` returns the snapshot | CARD-006 | AC-1 **Δ** |
| 017.1 | `/api/events` emits full snapshot once on connect | CARD-007 | AC-1 |
| 017.2 | …and on every change | CARD-007 | AC-2 |
| 018.1 | `/api/cards/:id/docs` reads the primary checkout | CARD-008 | AC-1 |
| 018.2 | …and the worktree; worktree wins | CARD-008 | AC-2 |
| 018.3 | Every doc labeled with its source | CARD-008 | AC-3 |
| 019 | Snapshot: generatedAt, projectName (dir basename **Δ**), config, cards, milestones, parseErrors | CARD-005 | AC-1 (+AC-2/3/4 for sub-shapes) |
| 020.1 | Frontmatter fields → model | CARD-004 | AC-1 |
| 020.2 | `criteria {done,total}` counted under `## Acceptance criteria` only | CARD-004 | AC-2 |
| 020.3 | Why + Notes extracted from the body | CARD-004 | AC-3 |
| 020.4 | Missing optional fields don't fail the parse | CARD-004 | AC-5 |
| 021.1 | Parsing uses gray-matter | CARD-004 | AC-1 |
| 021.2 | PR state inferred, never queried; no auth | CARD-006 AC-2 **Δ**; CARD-010 | AC-4 |
| 022 | Split card in deliver with k of N pr_urls → "slice k/N" | CARD-010 | AC-4 |
| 023.1 | Header: project name + WIP indicator, amber at limit | CARD-012 | AC-1 |
| 023.2 | Connection dot (live / reconnecting) | CARD-012 | AC-3 |
| 024 | Eight flow columns; card renders in its status column | CARD-009 | AC-2, AC-3 |
| 025.1 | Blocked card renders in its phase column, red flag + reason | CARD-011 | AC-1 |
| 025.2 | Column from `phase` when flow-valued | CARD-011 | AC-2 |
| **025.3** | **…else inferred from which phase docs exist** | **CARD-004 AC-6 (records) → CARD-011 AC-2 (consumes)** | **CLOSED Δ** |
| 025.4 | …else fallback Backlog | CARD-011 | AC-2 |
| 026 | split/superseded → collapsed de-emphasized drawer | CARD-011 | AC-3 |
| 027 | Unrecognized status → labeled overflow column | CARD-011 | AC-4 |
| 028.1-3 | ID badge, title, type+layer badges | CARD-010 | AC-1 |
| 028.4 | depends_on chips, grayed once done | CARD-010 | AC-2 |
| 028.5 | Criteria progress bar with "3/5" | CARD-010 | AC-3 |
| 028.6 | PR chips (design + impl) as links | CARD-010 | AC-4 |
| 028.7 | Rework badges only when non-zero, "↻2 implement" | CARD-010 | AC-5 |
| 028.8 | Red BLOCKED flag + reason (restates 025.1) | CARD-011 | AC-1 |
| 029.1 | Column change → FLIP animate + brief highlight | CARD-013 | AC-2 |
| 029.2 | Field-only change → highlight in place | CARD-013 | AC-3 |
| 030 | Collapsible right rail, timestamped session events, starts empty | CARD-014 | AC-1, AC-2, AC-3 |
| 031 | Toggleable strip: completion bar + card IDs per milestone | CARD-015 | AC-1, AC-2 |
| 032.1 | Panel: Why, criteria checklist w/ checked state, Notes | CARD-016 | AC-1 |
| 032.2 | Frontmatter table: branch, worktree, ADRs, est vs actual, dates | CARD-016 | AC-2 |
| 032.3 | One tab per phase doc, fetched on open, markdown, source-labeled | CARD-016 | AC-3 |
| 033.1 | Malformed card.md → parseErrors; others still parse | CARD-005 | AC-4 |
| 033.2 | Unparseable tray shows filename + error; board renders around it | CARD-017 | AC-1, AC-2 |
| 034.1 | Board re-renders from each SSE snapshot | CARD-012 | AC-2 |
| 034.2 | EventSource auto-reconnect re-syncs; dot shows state | CARD-012 | AC-3 |
| 035 | Unset/missing worktree falls back; absent docs get no tab | CARD-008 AC-4; CARD-016 | AC-3 |

**35 of 35.** REQ-001 is claimed once by CARD-006 AC-2 and is observable (tree-hash before
and after, plus a network assertion); its weakness is guard *breadth*, not coverage —
routed to the design phase. REQ-007 needs no re-claim: `INT-COVERAGE` is a property of the
**board**, not of one proposal, and existing CARD-001 AC-4/AC-5 carry it. Re-claiming it
would have been an `INT-NO-OVERLAP` finding instead.

## Size

`size_limit`: 500 changed lines including tests. Excluded per `size_exclude`:
`package-lock.json`, `node_modules/**`, `vendor/**`, `docs/cards/**` (the cards, their
frontmatter, and this report), the other lock globs. Test **fixtures** under
`test/fixtures/**` are *not* excluded and are counted throughout — they are material here
(fixture card.md files are frontmatter-heavy, ~25-28 lines each).

**Greenfield caveat (`_method.md` appendix):** `Glob` returns no `package.json`, no `src/**`,
no configs. Every estimate derives from acceptance criteria alone, assuming CARD-001 has
landed. TDD project: test lines ≈ code lines. The checker fails only on a breach of the bound.

| card | round 0 | **round 1** | verdict |
|---|---|---|---|
| CARD-004 | 345 | **393** | ok — re-derived for AC-6 (range 320-470) |
| CARD-005 | 390 | **390** | ok — stands; watch at slice |
| CARD-006 | 528 **BREACH** | **313** | ok — split (range 250-390) |
| CARD-018 | — | **305** | ok — new (range 240-380) |
| CARD-007 | 307 | **307** | ok — stands |
| CARD-008 | 230 | **230** | ok — stands |
| CARD-009 | 420 | **420** | ok — stands; watch at slice |
| CARD-010 | 510 | **510** | straddle, advisory — stands |
| CARD-011 | 340 | **340** | ok — stands |
| CARD-012 | 325 | **325** | ok — stands |
| CARD-013 | 305 | **305** | ok — stands |
| CARD-014 | 260 | **260** | ok — stands |
| CARD-015 | 145 | **145** | ok — stands |
| CARD-016 | 502 | **502** | straddle, advisory — stands |
| CARD-017 | 122 | **122** | ok — stands |

Set ≈ **4,867** across 15 cards (round 0: 4,729 across 14). The +138 is exactly CARD-004's
+48 and the split's +90 seam — the arithmetic reconciles, which is the cross-check that no
work was lost or invented in the rework. With CARD-001/002/003's 584 the whole viewer lands
≈ 5,450, a plausible order of magnitude for a TS + React app of this spec's scope.

### CARD-004 — 393 (was 345; **not** 365)

| file | new/edit | lines | basis |
|---|---|---|---|
| *(round-0 total)* | | 345 | types 45, parse-card 110, fixtures 90, tests 100 |
| `src/server/parse-card.ts` | edit | +15 | readdir the card dir; match the 6 known names + `/-check\.md$/` (AC-6). Cheap because the fn already takes the dir path |
| `src/shared/types.ts` | edit | +3 | the presence field |
| `src/server/parse-card.test.ts` | edit | +30 | two cases plus tmpdir fixture setup |
| **total** | | **393** | range 320-470 |

### CARD-006 — 313 (was 528 unsplit; **not** 300)

Two ACs, both integration-shaped — which is why tests (175) legitimately exceed code (133):

| file | new/edit | lines | basis |
|---|---|---|---|
| `src/server/cli.ts` | new | 35 | positional repo path only — the three flags are CARD-018 |
| `src/server/http-server.ts` | new | 70 | Node http, `/api/board` route, JSON, 404 (AC-1) |
| `src/server/index.ts` | edit | 25 | wire CARD-001's minimal entry |
| `package.json` | edit | 3 | |
| tests | new | 175 | npx-level integration 65 (incl. the server-spinning helper CARD-018 reuses); **REQ-001 no-write/no-network** 40; http-server unit 45; cli 25 |
| fixtures | new | 5 | reuses CARD-005's board fixture |
| **total** | | **313** | range 250-390 |

### CARD-018 — 305 (new; **not** 250)

| file | new/edit | lines | basis |
|---|---|---|---|
| `src/server/cli.ts` | edit | 55 | three flags, defaults, help (AC-1..AC-3) |
| `src/server/validate-board.ts` | new | 30 | dir exists; `config.md` or any `CARD-*`; the message (AC-4) |
| `src/server/find-port.ts` | new | 30 | EADDRINUSE → increment (AC-1) |
| `src/server/open-browser.ts` | new | 20 | AC-3 |
| `src/server/index.ts` | edit | 15 | wire flags, validation, port selection, open |
| tests | new | 135 | cli flags 65 (incl. AC-2's non-default board); validate 40; find-port 30 — net of ~25 saved by reusing CARD-006's server-spinning helper |
| fixtures | new | 20 | empty dir; dir with neither `config.md` nor `CARD-*`; a board at a non-default path (AC-2) |
| **total** | | **305** | range 240-380 |

**Seam cost:** 313 + 305 = 618 against the unsplit 528, i.e. **+90 (17%)** in duplicated test
scaffolding and fixtures. Expected and acceptable — it buys two cards at 63% and 61% of
budget instead of one at 106%.

### The other 12 — stand

Each re-tested against its delta; none moved. CARD-005's "(from the target directory's
basename)" and CARD-008's seven-pattern enumeration were already inside their round-0
per-file costs — the ACs got more precise, the code did not get bigger. CARD-009's REQ-006
index entry and CARD-011's new `depends_on` edge are frontmatter-only, and `docs/cards/**`
is in `size_exclude`.

## Blocking findings

None. Both round-0 blockers are closed:

**1. `INT-COVERAGE` — REQ-025's stranded inference. CLOSED.** CARD-004 AC-6 records which
phase docs exist → CARD-005 AC-1 carries the model into the snapshot's `cards` → CARD-011
AC-2 reads it, reachable transitively (011→010→009→006→005→004) with no `depends_on` change
and no per-card fetch behind column placement. The `INT-NO-OVERLAP` risk projected when the
remedy was proposed does not materialize: CARD-004 claims *recording*, CARD-011 claims
*choosing and rendering*.

**2. `INT-SIZED` — CARD-006 at 528. CLOSED.** Split with no renumbering: CARD-006 keeps
`{REQ-001, REQ-010, REQ-016}` at 313 and CARD-018 takes `{REQ-011..REQ-014}` at 305,
CARD-007/008/009 untouched at `depends_on: [CARD-006]`. Coverage preserved exactly, both
children vertical and user-reachable, both milestone invariants surviving CARD-018's
insertion into M2.

**Note on the rebuttal considered in round 0:** "`right_sized: \"\"` — the slicer re-checks
and splits at pickup; INTAKE.md says intake is the coarse slicer." It loses on the plain text
of `checks/intake.md`: the criterion is that no proposed card is *projected* to exceed the
limit, unconditioned on `right_sized`. `right_sized` governs whether a *second* check runs,
not whether this one binds.

## Advisory findings

**1. `INT-SIZED` — three estimates corrected before writing (the checker's error).**
CARD-004 (365 → **393**), CARD-006 (300 → **313**), CARD-018 (250 → **305**). The coordinator
took those numbers from round-0 prose, but they were seam-level sketches written to size a
remedy, not derivations per `_method.md`'s appendix. None breaches, so this is not a gate —
but these numbers are the baseline `DLV-SIZE` reports `actual_lines` against and the only
signal `/retro`'s under-estimation check ever sees. **Applied:** 393 / 313 / 305 persisted.

**2. `INT-MILESTONE` — the browser-open note belongs on CARD-018, not CARD-006.**
After the split CARD-006 does not open a browser — neither AC mentions one, and the behaviour
ships with CARD-018 AC-3. The underlying incoherence survives the fix rather than being
removed by it: CARD-018 is M2, CARD-009 is M3, so M2's exit state opens a browser at a `GET /`
that 404s. Only moving CARD-009 or adding a placeholder AC removes it; the coordinator
declined the former (a 420-line UI card would make "headless board API" false), which the
checker judged sound. M2's Exit criteria is honest: it claims the API and the non-zero exit,
never a working browser. **Applied:** note moved to CARD-018's Notes beside AC-3.

**3. `INT-REQ-RESOLVES` — the parser counts as the server half; so does the watcher.**
REQ-006 enumerates rather than describes: "Server (`src/server/`): CLI entry, chokidar file
watcher, card parser, small Node HTTP server exposing the API and serving the pre-built UI
bundle". "card parser" is CARD-004 verbatim; "chokidar file watcher" is CARD-007 verbatim.
Applying REQ-006's own list: CLI entry → CARD-006 ✓; chokidar watcher → CARD-007; card parser
→ CARD-004; HTTP server → CARD-006 ✓; bundle serving + SPA → CARD-009 ✓. Not CARD-005 (not
named — an index that stretches to cover everything indexes nothing) and not CARD-018
(CARD-006 already indexes the CLI entry). **Applied:** REQ-006 added to CARD-004 and CARD-007.

**4. `INT-SIZED` — CARD-010 (~510) and CARD-016 (~502) still straddle.** Correctly handled:
seams recorded in Notes, `right_sized: ""` kept, estimates unchanged. The line between these
and the CARD-006 block was **confidence in the projection, not the point estimate**.
CARD-006's overage was countable (seven REQs, five modules, two irreducible integration
tests); these two are dominated by a styling decision nobody has made (plain CSS ~85/~70 vs a
utility framework ~0, with ~15% more JSX — a ±70 swing each). `SLC-SIZE` re-checks both
against a real tree once CARD-009 has shipped. Cost of the restraint is one slice-phase split,
not a shipped 600-line PR.

## Note on reqs-as-index (not a finding)

Adding REQ-006 to CARD-004/006/007/009 creates the set's first `reqs` ids with **no AC citing
them** — breaking a pattern round 0 verified held. This is legitimate and should not be
flagged by a later checker or `/retro`. INTAKE.md defines `reqs` as "the machine-readable
index `/requirement` uses for impact analysis"; it requires each AC to cite the requirement
*it* enforces, but not the converse. REQ-006 is structural — a card *is* part of the
architecture it describes without having a behaviour to assert about it, and CARD-006 has no
AC that could honestly cite it ("starts a server" is REQ-010/016). Forcing an AC would be
cargo cult.

**The rule:** a `reqs` id with no AC citation is correct when the REQ is structural and the
card's relationship to it is *residence*, not *behaviour*; every behavioural REQ must still be
cited by an AC. Nothing in this set violates that. Relatedly, REQ-006 is now indexed on five
cards (001, 004, 006, 007, 009) — that is not `INT-NO-OVERLAP`, which is about *claimed work*;
these cards' ACs are disjoint.

## The CARD-001 handoff obligation — discharged

Re-verified after the rework, since CARD-004 and CARD-006 both changed:
1. **No duplicate scaffold** — CARD-004..CARD-018 contain no package.json/tsconfig/ESLint/
   Vitest/Vite card. The set starts at the parser. CARD-018 edits `cli.ts`; it does not create
   the package.
2. **`depends_on` wired** — CARD-004 → [CARD-001] is the single entry edge from the new set
   into M1; everything else reaches CARD-001 transitively, CARD-018 included
   (018→006→005→004→001). No new card floats free of the scaffold.
3. **REQ-007 not re-claimed** anywhere. REQ-006 *is* now indexed on CARD-004/006/007/009 —
   deliberate indexing, not duplication: no AC on any of them claims CARD-001's build/packaging
   work, and CARD-009 AC-1 (serve) stays distinct from CARD-001 AC-4 (build).
4. **Residue closed** — round 0's only loose end (REQ-006 unindexed) is what advisory 3
   finishes.

## Spec notes (not card findings)

`/refine` may not author requirement content, so these are surfaced to the driver as
`/requirement` candidates:
1. **REQ-020's model is under-enumerated** against REQ-025 and REQ-032. It omits phase-doc
   presence — now fixed at card level by CARD-004 AC-6, so the spec and the code have
   deliberately diverged and a future `/requirement` should reconcile REQ-020 to what the
   parser produces. It also omits `branch`, `worktree` and `adrs`, which REQ-032's frontmatter
   table renders; those ride in free on gray-matter, which is why they are advisory and the
   phase-doc field was blocking.
2. **REQ-003's "and other tunables"** is unbounded; REQ-019 shows only `config: { wipLimit: 3 }`.
   CARD-005 AC-2 covers the enumerable part. Thin REQ, not a thin card.
3. **REQ-021's "PR merged-state is inferred"** has no consumer in the spec: REQ-028's PR chips
   are links only, and nothing renders merged vs open. The nearest realization is REQ-022's
   slice k/N. The clause reads as a constraint (don't query) with a vestigial positive half.

## Notes for the design phase (not findings)

1. **REQ-001's guard breadth** (on CARD-006's Notes): site the no-write/no-network assertion
   suite-wide — e.g. a fixture that hashes the target tree before and after every server-level
   test — rather than inside CARD-006's test file. CARD-007's watcher, CARD-008's doc reads and
   CARD-018's validation all touch the target repo and none has an AC that would catch a
   regression. Cheap now, unbuyable later.
2. **CARD-006 AC-1 hardcodes port 4400 and CARD-018 brings the auto-increment** — so between
   the two cards landing, CARD-006's integration test binds a fixed port and will flake on any
   machine or CI runner with 4400 busy. Bind an ephemeral port (`:0`) and assert the served
   snapshot, leaving the *default* 4400 to CARD-018 AC-1 where it is actually claimed.
3. **CARD-004 AC-6's readdir is per-card, per-parse**, and REQ-008 re-parses everything on
   every debounced change. Negligible on a board of tens of cards (the spec says so
   explicitly), but the phase-doc scan should ride the directory read the parser already does
   rather than adding a second `readdir` per card.

## Round history

| round | verdict | blocking | resolution |
|---|---|---|---|
| 0 | fail | INT-COVERAGE — REQ-025's phase-doc inference stranded; INT-SIZED — CARD-006 at 528 | CARD-004 AC-6 + REQ-025 added; CARD-006 split into CARD-006 (313) + CARD-018 (305); all 8 advisories applied |
| 1 | **pass** | none | 3 advisories: 3 estimate corrections, 1 misplaced note, REQ-006 index extended to CARD-004/CARD-007 — all applied before writing |
