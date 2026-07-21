---
phase: check
checks: design
card: CARD-027
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

# CARD-027 — design-check (rework 1)

## Verdict
**Pass.** The single blocking finding from the prior round (DSG-AC-COVERED: card AC2's
"its own current snapshot" claimed but not asserted) is genuinely remedied, not reworded.
Task 3 now splits into 3a (static deep-equal — shape + registry) and 3b (call-varying
provider — freshness), 3b's assertions are robust in both directions, and AC-2(b)'s
wording no longer outruns what ships. Five advisory findings; none makes the design wrong.
No execution was available to this checker (Read/Grep/Glob only) — every claim below that would need
a command to settle is marked as such.

## Criteria
| id | verdict | evidence |
|---|---|---|
| DSG-AC-COVERED | pass | Card AC1→design AC-1→tasks 1-2 (`design.md:270-298`); card AC2→design AC-2(a) task 2's `nextFrame(300)` rejects `/timed out/` not `/stream ended/` + AC-2(b) tasks 3a/3b (`design.md:299-325`). 3b's `p1`/`p2`/`calls===2` reddens under the cached-frame mutant (cache ⇒ B gets `p1`, `calls===1`) and cannot false-red a legitimate impl: `openSse` awaits `fetch`, whose response headers cannot arrive before `writeHead`, which the designed order puts after `snapshot()` — and B's fetch is not even initiated until A's frame has been read, so call order is deterministic by construction, not by luck. No sanctioned flow calls `snapshot()` twice per connection (a subscribe-then-`hub.publish(snapshot())` variant would broadcast B's frame to A and redden 3a instead). Design AC-3→task 4, AC-4→task 5. |
| DSG-SPEC-FIDELITY | pass | Opened all seven cited ranges in `docs/spec.md`: REQ-001 13-16 ✓, REQ-006 56-63 ✓, REQ-008 71-77 ✓, REQ-017 128-132 ✓ ("on every change (and once on connect)"), REQ-019 141-153 ✓ (snapshot shape), REQ-034 261-265 ✓, Testing 291-300 ✓. Implementing only REQ-017's connect clause is the slice boundary (`slice.md:33-41`), stated at `design.md:6-8`, not a contradiction. |
| DSG-TASK-TDD | pass | Six file-level tasks over exactly two files (`design.md:265-357`), each red→implement→green→lint/typecheck→commit. Task 1 is red today (404 JSON on `/api/events`); tasks 3-5 name their red condition. The one non-red test (newline-title edge, "green on arrival") is labelled as such and substitutes two named `formatFrame` mutations — honest, not a gap. Advisory: two steps under-specified (see findings). |
| DSG-DOCTRINE | pass | Rule-by-rule below. Spec-over-training ✓ (every rule line-cited), as-of ✓ (per-connection evaluation is the card's central as-of rule and is pinned by 3b), parallel-derived ✓ (shape vs freshness asserted separately; connect-frame vs `publish` broadcast named per consumer), determinism ✓, numeric precision `na`. |
| DSG-ADR-NEEDED | pass | One ADR on disk at `design.md:434-474` (durable copy per AGENT-PROTOCOL), covering the wire format, hub ownership, per-connection evaluation and the catch scoping. Read `docs/adrs/README.md` (11 ADRs): it duplicates none, and correctly states "Extends ADR-0010; supersedes nothing" — `hub?` is additive to ADR-0010's `createServer(options): Server`, and alternative (c) (`{server, hub}`) is rejected precisely to preserve that signature. Reconciles with CARD-008's proposed `repoRoot` ADR, which reciprocally cites CARD-027's `hub?`. |
| DSG-KNOWLEDGE | pass | All three `[CARD-027]` entries are consumed, not name-dropped: `closeAllConnections` before `close()` incl. the not-a-no-op-for-the-six rationale (`design.md:173-179`); deep-equal blindness → the split into 3a/3b (`design.md:26-31`); afterEach-over-finally + non-composing timeouts → the two module-level arrays and `{ timeout: 10_000 }` (`design.md:91-94, 167-172`). Also honours [CARD-022] (CRLF/newline framing), [CARD-021] (`card-model.ts` type-only import), [CARD-001] (`tsc -b --noEmit`). Re-treads none. |
| DSG-SCOPE | pass | Explicit In scope (`design.md:39-47`) / Out of scope (`design.md:49-59`) with each exclusion routed to a named card. Every task serves an AC: 1-2→AC-1/AC-2(a), 3a/3b→AC-2(b), 4→AC-3, 5→AC-4, 6→verification. `publish` is sanctioned as out-of-coverage by `card.md:47-50` and `slice.md:38-41`; AC-3/AC-4 are hub correctness and ADR-0010's standing route contract, not creep. Advisory: budget calibration and doc length. |
| DSG-NO-CODE | pass | Design branch is docs-only: the worktree's `src/server/http-server.ts` (45 lines) has no SSE branch and `http-server.test.ts` (218 lines) has no `openSse` — both untouched. The fenced blocks are Interfaces (types/signatures), a pseudo-flow sketch and a five-line test-setup fragment inside task 3b — prescriptions in the doc, no code file written. |

## Acceptance criteria → tasks
**Criteria → tasks (every criterion has one):**
| criterion | tasks | observable |
|---|---|---|
| card AC1 / design AC-1 (`/api/events` emits the full snapshot once on connect) | 1, 2 | 200 + `text/event-stream; charset=utf-8` + `no-cache, no-transform`; `frame.startsWith('data: ')`, no raw `\n` inside the data line, `JSON.parse` deep-equals `buildSnapshot(options)` plus fixture-derived cross-checks |
| card AC2 first clause / design AC-2(a) (stays open) | 2 | `nextFrame(300)` rejects `/timed out/` and **not** `/stream ended/` — two distinguishable messages, mutation-verified in task 6 |
| card AC2 second clause / design AC-2(b) (a second connection gets its own current snapshot) | 3a, 3b | 3a: B's frame deep-equals the board, A still open, `hub.subscriberCount === 2`. 3b: A=`p1`, B=`p2`, `calls === 2`, payload otherwise intact |
| design AC-3 (disconnect unsubscribes) | 4 | `expect.poll(() => hub.subscriberCount)` 2 → 1 → 0, bounded 1 000 ms |
| design AC-4 (ADR-0010 500 contract on the new route) | 5 | 500 + `{"error":"internal error"}`, `not.toContain('boom')`, JSON content-type (no half-written SSE) |

**Tasks → criteria (no orphan task):** 1→AC-1 + the shared harness (`openSse`, the two sweep
arrays, `withServer`'s `closeAllConnections`); 2→AC-1 + AC-2(a) + the framing invariant;
3a→AC-2(b) shape/registry; 3b→AC-2(b) freshness; 4→AC-3; 5→AC-4; 6→verification of tasks
2/3b's mutation claims, the `requestTimeout` assumption, JSDoc and the gate sweep.

## Doctrine
- **Spec outranks training** — honoured. Every rule is line-cited and all seven ranges were opened;
  each says what the design claims. The half-of-REQ-017 boundary is traced to `slice.md:33-41`, not
  to memory.
- **Numeric precision** — `na`. No money, no rounding, no decimal arithmetic: the only numeric in the
  payload is `config.wipLimit`, an integer passed through `buildSnapshot` unchanged, and the only other
  numbers are wall-clock timeout budgets.
- **Parallel derived values** — honoured. Two related quantities exist and each consumer is named: the
  connect-time frame (this card, written directly to the connecting `res`) versus the broadcast frame
  (`hub.publish`, CARD-029's seam, explicitly no caller here). Second instance: shape (static
  `buildSnapshot` deep-equal) and freshness (call-varying provider) are asserted separately and never
  conflated — that separation is precisely the prior round's fix.
- **As-of semantics** — honoured, and it is this card's core rule. "Each connection receives a snapshot
  evaluated at its own connect time — not a frame computed once and replayed", restated as a decision in
  the ADR and pinned by 3b rather than left to the implementer. Ordering within the test is deterministic
  by construction (sequential awaits; headers cannot precede `snapshot()`).
- **Determinism** — honoured. Fixed clock (`FIXED`), ephemeral `:0` ports, loopback only, no network
  (ADR-0011 guards wrapped round task 2), no chokidar and no timers under test, every wait bounded
  ≤2 000 ms, `{ timeout: 10_000 }` on every multi-wait test because per-wait budgets do not compose,
  polls bounded at 1 000 ms, and teardown in `finally` **plus** an `afterEach` sweep for the
  vitest-abandons-a-timed-out-chain case. The one wall-clock-based *positive* assertion (the 300 ms
  negative read) is identified as such, widened from 150 ms and mutation-verified in task 6 — the right
  treatment.

## Blocking findings
None. The prior round's DSG-AC-COVERED blocker is cleared: card AC2's "its own current snapshot" is now
asserted by an injected call-varying provider (`p1`/`p2`/`calls === 2`), the AC-2(b) wording describes
exactly those assertions and no more, and the mutation→break map records the asymmetry (3b reddens under
the cached-frame mutant, 3a stays green) as the reason 3b exists.

## Advisory findings
1. **`design.md:77-78` — the CARD-008 guard claim is broader than the test.** "Task 5's test is the
   guard that reddens if it does not [preserve the branch-scoped catch]" holds only for the sub-case
   where `snapshot()` itself moves after `writeHead` (already its own mutation row). Task 5's provider
   throws *before* `writeHead`, so a hoist that deletes the inner catch while leaving `snapshot()` first
   still yields a clean 500 and task 5 stays green. The silent post-`writeHead` case named in the same
   bullet has no test — which is defensible (nothing in the branch throws synchronously after
   `writeHead`), but the defence is the merge-order instruction and the ADR clause, not a guard test.
   Cross-checked against CARD-008's reworked design: it does hoist to "one handler-wide catch" and does
   not mention preserving an inner SSE catch, so the instruction has to carry the weight. The two designs
   are otherwise mutually consistent and each cites the other.
2. **`design.md:103-112` — the ~276 budget is light on the test half.** +198 leaves ~118 lines for seven
   `it`s after `openSse` (~65, the design's own figure) and the sweep/`withServer` edits (~15) ≈ 17
   lines/`it`, against the file's demonstrated 24.3 ((218−72)/6). At the real rate the total is ~328, not
   276. No 500 breach either way and design-check carries no size criterion, so this is calibration, not
   a defect — but the pre-authorised cut list should be sized off ~328.
3. **`design.md:1-475` — 475 lines against AGENT-PROTOCOL's ≤150 advisory budget** (the pre-rework doc
   was already ~200). Nothing here is padding; recording it because the protocol makes over-budget an
   advisory finding.
4. **`design.md:167-172, 349-352` — two of the six advisory fixes land a line short.** The `afterEach`
   server sweep does not name its still-listening predicate (`server.listening`), whether it awaits each
   `close()`, or that it splices the arrays as the existing `tmpDirs` sweep does
   (`http-server.test.ts:25-29`) — relevant because `close()` on an already-closed server calls back with
   `ERR_SERVER_NOT_RUNNING`. The `requestTimeout` probe says "set `server.requestTimeout = 200` before
   `listen`" in "a scratch copy of task 2's test", but `withServer` constructs and listens the server
   internally and never exposes it, so the scratch copy must inline `createServer` + `listen`. Both are
   implementable; both cost a clarifying clause.
5. **`design.md:96-100` — the coverage arithmetic is an unmeasured estimate.** A grep over
   `src/server/**/*.ts` minus `index.ts`/`*.test.ts` finds ~25 named/braced functions, not ~35 (v8 also
   counts inline arrow callbacks, so ~35 is plausible but unconfirmed). The conclusion is unaffected —
   one uncovered function is ≥96.8% at any count in that range against a 90% **global** threshold, and
   `vite.config.ts:17-22` does set no `perFile`, verified.

## Claims verified, and claims that could not be
Verified by reading the real files: the six existing `it`s at `http-server.test.ts:75, 108, 131, 144,
159, 189` and six `ServerOptions` literals (exact); `http-server.ts` on line 19 of
`tsconfig.test.json`'s `include`; `vite.config.ts:17-22` thresholds with no `perFile`; vitest resolved
at **3.2.7** in `package-lock.json`; `buildSnapshot(BuildSnapshotOptions)` accepts task 3b's
`{boardDir, projectName, now}` literal, so `base` typechecks; all seven spec ranges; `slice-check.md:40`
and `:45-49` say what is claimed. **Not settleable without execution (Read/Grep/Glob only):** that the
six existing tests stay green once `closeAllConnections()` enters `withServer`'s `finally` (task 1 makes
this an explicit stop-and-reconsider checkpoint — the right handling); the `requestTimeout` default and
its scope (the design already labels this an unverified assumption and probes it in task 6);
`expect.poll`'s "shipped in 2.1" provenance (it exists in 3.2.7, which is what matters); and every
mutation→break row, which task 6 runs for real.

## Orchestrator note — advisory 1 applied at ADR persistence
Consistent with ADR-0012 and ADR-0013, the advisory concerning text that lands permanently on `main` was
applied when routing the ADR: ADR-0014's scoping clause no longer claims a guard test covers the
widened-catch case, and states plainly that the defence is the merge-order instruction plus the ADR
itself. `design.md` is left as the producer wrote it. Advisories 2-5 ride the PR for the implementer;
**4 in particular should be actioned at implement time** — both under-specified steps are cheap to
resolve but easy to get subtly wrong.
