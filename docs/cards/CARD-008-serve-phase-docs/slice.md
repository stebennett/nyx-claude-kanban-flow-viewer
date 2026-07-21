# CARD-008 — slice (rework 1)

## Verdict
**Keep as one card.** `right_sized: true`. Recorded `estimated_lines: 460`.

The prior proposal split this card on a global 1.5–2.2x historical drift factor. The
slice-check correctly identified that this card's own shape — route-shaped work, reusing a
pre-built, self-tested guard suite — carries a corrected factor of ≈1.16x (from CARD-006's
guard-suite-excluded actual/estimate: 292/252). Applying that corrected factor to either the
checker's bottom-up 416 or my own bottom-up below still lands under 500.

There is no `SLC-SIZE` breach, and the four ACs form one coherent vertical slice — one stable
endpoint, one response contract (`{ docs: [{ name, content, source }] }`) — where the second
half (worktree-winning) is the spec's actual real-world case (REQ-005), not a deferred
nice-to-have. Splitting it would have shipped a first slice whose primary use case doesn't
yet work.

## Size estimate (bottom-up)

| File | Change | Est. lines |
|---|---|---|
| `src/server/phase-docs.ts` (new) | Import `PHASE_NAMES` from `card-model.ts` (no need to redeclare); local `hasCheckDoc`-equivalent matcher (~6 lines, mirrors `parse-card.ts`'s private one since it's unexported); `readDocsFromDir(dir)` — safe `readdirSync` (ENOENT → `[]`), filter to the 6 named docs + `*-check(-*).md`, read each file; `readPhaseDocs(cardDir, worktreeDir?)` — read primary, read worktree (if set and exists), merge with worktree overriding on filename collision, label `source`, sort by name for determinism; exported types | ~75 |
| `src/server/http-server.ts` (modified) | Import `readPhaseDocs`, `path`; regex-match `GET /api/cards/:id/docs`, extract `:id`; `snapshot().cards.find(c => c.id === id)`, 404 `{error:'not found'}` when absent; else `200 { docs: readPhaseDocs(path.join(boardDir, card.dirName), card.worktree ? path.join(...) : undefined) }` wrapped in the existing try/catch → 500 pattern | ~35 |
| `src/server/phase-docs.test.ts` (new) | Fixture-dir helper (mkdtemp, write files) + cleanup; cases: all 6 named docs + exact check-doc + numbered check-doc variants read with `main-checkout` label; non-doc files ignored; deterministic sort; worktree-only doc appears with `worktree` label; conflicting filename → worktree content+source wins; worktree path unset → falls back silently; worktree path set but nonexistent → falls back silently; merged sort stays deterministic regardless of read order (~8 cases) | ~160 |
| `src/server/http-server.test.ts` (modified) | New `describe('GET /api/cards/:id/docs')` reusing the existing `writeFixtureBoard`/`withServer` harness (no new scaffolding cost): 200 with main-checkout docs + labels; worktree doc merged and labeled, worktree wins on conflict; unknown card id → 404; worktree unset/missing → falls back without error; REQ-001 guard wrap via `assertNoRepoWrites`/`assertNoNonLoopbackNetwork` (~5 cases) | ~140 |
| `tsconfig.test.json` (modified) | add `phase-docs.ts` to `include` | ~1 |

**Bottom-up total ≈ 411** (82% of the 500 cap).

**Applying the corrected drift factor** (this card's shape, ≈1.16x, not the global 1.5–2.2x):
411 × 1.16 ≈ **477** (95% of the cap) — still under, though the margin is real rather than
generous. This sits inside the slice-check's own bracket (416 bottom-up; 460–490 as the prior
single-card figure) and inside its remedy's suggested range (420–490).

`estimated_lines: 460` is recorded — near the top of that band, so a modest overrun during
implementation is not itself a surprise, while staying honest that the bottom-up walk (411) is
the real basis and does not force a split.

## Basis
- CARD-006's 313→679 overrun was dominated by building `test/server-guard.ts` (387 of 679
  lines) — a cost CARD-008 does not pay; the guard exists and is self-tested.
- CARD-006's route-shaped remainder (route + tests + CLI wiring, excluding the guard build) ran
  292 actual against ~252 estimated ≈1.16x — the applicable comparator for CARD-008's shape.
- CARD-008's real new logic is a dual-directory read-merge, source labeling, and a
  silent-fallback contract — genuine complexity, but the kind the four ACs already scope
  tightly (no hidden fifth requirement), and it reuses `PHASE_NAMES` and the HTTP test harness
  rather than building from nothing.
- No file in the estimate approaches its own outsized risk (largest is `phase-docs.test.ts` at
  ~160, well below the ~360–460 range of this repo's other pure-function test files for
  genuinely larger modules).

## What was checked to derive this
- `src/server/http-server.ts` — manual `(method, pathname)` dispatch, `sendJson` helper;
  `CardModel` already carries `worktree: string` and `dirName: string` (no new lookup plumbing).
- `src/server/parse-card.ts` — `hasCheckDoc` (6-line matcher) is private; CARD-008 needs its own
  equivalent, but `card-model.ts` already exports `PHASE_NAMES` — one less thing to hand-roll.
- `test/server-guard.ts` — `assertNoRepoWrites`/`assertNoNonLoopbackNetwork`, self-tested, reused
  as-is (no rebuild cost).
- `src/server/http-server.test.ts` — `writeFixtureBoard`/`withServer` harness already built and
  reusable; new endpoint tests are additive `describe` blocks, not new scaffolding.
- Comparable pure-function test files for calibration: `parse-card.test.ts` (458 lines) and
  `build-snapshot.test.ts` (362 lines) — both larger modules with more branching than
  `phase-docs.ts` needs.

## Dependency rewiring
None. CARD-016's `depends_on: [CARD-009, CARD-008]` is unchanged.
