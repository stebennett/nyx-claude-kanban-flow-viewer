# CARD-008 — Serve a card's phase docs · design (rework 1)

## Intent
Add `GET /api/cards/:id/docs` to the existing `node:http` dispatch (ADR-0010): return the card's phase
docs read from the card dir in the **primary checkout** and from the card's **worktree** checkout, merged
with the worktree copy winning, each doc labeled with its source. This is what makes the detail panel
(CARD-016) useful during flight, when most phase docs exist only on the card's branch (REQ-005).

## Acceptance criteria
- **AC-1 (REQ-005, REQ-018 · spec.md:47-52, 134-139):** `GET /api/cards/<known-id>/docs` returns
  `200 application/json; charset=utf-8` with body `{docs:[{name,content,source}]}` containing exactly the
  phase docs present in the primary card dir. Observable: fixture card dir holding `slice.md`, `design.md`,
  `implement.md`, `test.md`, `review.md`, `deliver.md`, `slice-check.md`, `deliver-check-design.md` plus
  `card.md` and `notes.md` → `docs.map(d=>d.name)` equals those **eight** names sorted, `card.md`/`notes.md`
  absent, each `content` equal to the fixture text written for that file.
- **AC-2 (REQ-005, REQ-018 · spec.md:47-52, 134-139):** with `worktree: .worktrees/<slug>` in frontmatter
  and that checkout on disk, a doc existing only in the worktree is returned with `source:'worktree'`, and a
  doc existing in **both** returns the **worktree** content. Observable: fixture writes `design.md` =
  `"MAIN design"` under `<repo>/docs/cards/<dir>/` and `design.md` = `"WORKTREE design"` + `implement.md`
  under `<repo>/.worktrees/<slug>/docs/cards/<dir>/`; response contains
  `{name:'design.md',content:'WORKTREE design',source:'worktree'}` and `implement.md` with `source:'worktree'`.
- **AC-3 (REQ-018 · spec.md:134-139):** every returned doc carries `source`, exactly one of
  `'main-checkout'` | `'worktree'`. Observable: in the AC-2 fixture the primary-only `slice.md` carries
  `source:'main-checkout'`; `docs.every(d => d.source==='main-checkout'||d.source==='worktree')` is true.
- **AC-4 (REQ-035 · spec.md:267-271):** `worktree: ""` (unset) **or** a `worktree` whose card dir is not on
  disk both yield `200` with only the primary-checkout docs and **no** error. Observable: three requests in
  one test — `worktree: ""`; a worktree root that **exists** while the card dir inside it does not (the
  normal in-flight shape: a design worktree cut from `origin/main` has no card dir for its own card yet —
  true right now of `.worktrees/CARD-023-cli-board-dir-flag`); and a card whose primary dir holds no phase
  docs at all → the first two return the primary set, the third returns `{docs:[]}`, none contains `error`.
  An **unknown** card id returns `404 {"error":"not found"}` (ADR-0010).

## In scope
- `src/server/phase-docs.ts` (new): `resolveCardDocDirs`, `readDocsFromDir`, `mergeDocs`, `readPhaseDocs`.
- `src/server/card-model.ts`: `DocSource`/`PhaseDoc`/`PhaseDocsResponse` types + the shared filename
  matchers `isCheckDocName`/`isPhaseDocName`.
- `src/server/parse-card.ts`: `hasCheckDoc` delegates to `isCheckDocName` (no behavior change).
- `src/server/http-server.ts`: required `repoRoot` on `ServerOptions`, the `/api/cards/:id/docs` route
  branch, and hoisting the existing per-route `try/catch` to one handler-wide catch.
- `src/server/index.ts`: pass `repoRoot`. `tsconfig.test.json`: add `src/server/phase-docs.ts`.

## Out of scope
- The detail-panel UI that consumes this (tabs, rendering, markdown) → **CARD-016**.
- SSE/watcher (`/api/events`) → CARD-007 line; SPA `GET /` → CARD-009; CLI flags incl. `--board-dir` → CARD-023.
- Any caching, ETag/If-None-Match, pagination, or size cap on doc content — docs are re-read per request
  (REQ-018 says "on-demand"); a local read-only server needs none of it (YAGNI).
- Markdown parsing/sanitising, `card.md` itself, and non-phase files in the card dir.
- Importing CARD-023's `args.ts`/`resolvePaths` (unmerged). This card adds only the `repoRoot` **field**;
  the value is produced at the `createServer` call site by whatever expression yields the resolved repo
  root at merge time (see Interfaces).
- **Known product decision, flagged not fixed:** by [CARD-020]'s exact-`<phase>.md` rule, split-slice docs
  `deliver-1.md`/`deliver-2.md` (real files here — CARD-006, CARD-021) are **not** served, while their
  `deliver-check-1.md`/`deliver-check-2.md` **are** (prefix rule). CARD-016 will therefore show a check-doc
  tab whose subject doc is missing. That is faithful to card.md's deliberate enumeration; widening it is a
  spec question (REQ-005), not this card's.

## Dependencies & assumptions
- CARD-006 merged: `createServer(options)` factory + JSON error contract (ADR-0010), `test/server-guard.ts`
  (ADR-0011), and the `writeFixtureBoard`/`withServer` fixture harness in `http-server.test.ts`.
- `buildSnapshot` is total (ADR-0008); `CardModel` already carries `dirName` and `worktree`.
- A `git worktree` checkout is a **full** checkout, so the board dir sits at the same repo-relative path
  inside it. If it doesn't, `readdirSync` throws ENOENT and we degrade to the primary docs (AC-4) — the
  assumption fails safe.
- `card.worktree` is repo-root-relative; an absolute value would also work via `path.resolve`.
- Node 20+, ESM (ADR-0001); `fast-check` is a devDependency and property seeds are pinned ([CARD-021]).
- **Merge-order tolerance.** CARD-023 (design PR open) and CARD-027 both rewrite this card's touch points.
  Neither blocks: see Interfaces for `index.ts`, task 6 for the `ServerOptions` literals, and task 6's note
  for the fixture harness.

## Approach
Domain logic is pure over plain data, fs is at one edge, and the response contract is a dependency-free
type the UI can `import type` ([CARD-021]):

1. `resolveCardDocDirs` — **pure string math**, holds the worktree trap (see ADR below).
2. `readDocsFromDir(dir, source)` — the only fs edge; total (`readdir` failure → `[]`, per-file read
   failure → skip), mirroring ADR-0008's degrade-never-throw stance.
3. `mergeDocs(primary, worktree)` — pure: union keyed by `name`, worktree entry replaces primary, output
   sorted by name with a **codepoint** comparator (not `localeCompare`, whose order is ICU-dependent
   between a macOS dev box and the ubuntu CI runner).
4. `readPhaseDocs(dirs)` — thin composition of 2+3.

Route: `GET /api/cards/:id/docs` matched by `/^\/api\/cards\/([^/]+)\/docs$/` against `url.pathname`; the
captured id is compared against `snapshot().cards[].id` and **never used to build a path** — the path comes
from the matched card's `dirName`, so traversal (`..%2F..%2Fetc`) is structurally impossible and simply
404s. The id is **not** `decodeURIComponent`'d: card ids are ASCII `CARD-NNN`, and decoding a malformed
`%` would throw `URIError` and turn a bad id into a 500.

**Alternatives considered.** (a) *Read docs during `buildSnapshot`* — rejected: REQ-018 says on-demand, and
it would put every card's full doc text in every SSE frame; REQ-019's snapshot shape doesn't carry them.
(b) *Derive the repo root as `resolve(boardDir,'..','..')`* — rejected: re-encodes the exact assumption
CARD-023 breaks, and fails silently (zero docs) rather than loudly. (c) *Duplicate a 6-line filename matcher
locally* (the slice estimate's shape) — rejected: [CARD-004]/[CARD-020] say reuse the canonical set; drift
between the presence scan and this endpoint means a tab with no content. (d)
*`readdirSync(…,{withFileTypes:true})` + `isFile()`* — rejected: a symlinked doc reports as neither file nor
dir; plain `readdir` + `try/catch` around `readFileSync` handles EISDIR, vanished files and symlinks in one
branch.

## Interfaces
```ts
// src/server/card-model.ts — dependency-free ([CARD-021]); types are UI-importable, the
// two matcher FUNCTIONS are server-side callers only ([CARD-020→CARD-011]).
export type DocSource = 'main-checkout' | 'worktree';
export interface PhaseDoc { name: string; content: string; source: DocSource; }
export interface PhaseDocsResponse { docs: PhaseDoc[]; }
/** Exact `<phase>-check.md`, or a numbered/named `<phase>-check-*.md` (e.g. deliver-check-design.md). */
export function isCheckDocName(phase: PhaseName, name: string): boolean;
/** True for any of the six `<phase>.md` docs or any phase's check-doc variant. */
export function isPhaseDocName(name: string): boolean;

// src/server/parse-card.ts — unchanged signature, body delegates:
//   hasCheckDoc(phase, names) => [...names].some((n) => isCheckDocName(phase, n))

// src/server/phase-docs.ts (new)
export interface CardDocDirs { primary: string; worktree?: string; }
/**
 * `card.worktree` is REPO-ROOT-relative while `boardDir` is the board's path; a worktree is a full
 * checkout, so its card dir is the board dir's repo-relative path inside the worktree checkout.
 * `path.resolve` lets an absolute `worktree` pass through. `worktree === ''` → `{primary}` only.
 */
export function resolveCardDocDirs(input: {
  repoRoot: string; boardDir: string; dirName: string; worktree: string;
}): CardDocDirs;
//   primary  = path.join(boardDir, dirName)
//   worktree = path.join(path.resolve(repoRoot, worktree), path.relative(repoRoot, boardDir), dirName)
export function readDocsFromDir(dir: string, source: DocSource): PhaseDoc[];  // total: never throws
export function mergeDocs(primary: readonly PhaseDoc[], worktree: readonly PhaseDoc[]): PhaseDoc[]; // pure
export function readPhaseDocs(dirs: CardDocDirs): PhaseDoc[];

// src/server/http-server.ts
export interface ServerOptions {
  boardDir: string;
  repoRoot: string;          // NEW, required — absolute; `card.worktree` is relative to THIS
  projectName: string;
  now?: () => Date;
  snapshot?: () => BoardSnapshot;
}
```
**`index.ts` (merge-order-neutral instruction, not a snippet).** Pass the already-resolved repo root that
is in scope at the `createServer` call, whatever expression yields it when this lands: today
`resolve(argv[2])`; after CARD-023, `resolve(args.targetRepo)` from `parseArgs`'s result at the same call
site. **Do not** change how `boardDir` is computed and **do not** reintroduce a hardcoded
`resolve(repoRoot,'docs/cards')` — after CARD-023 the board path comes from `resolvePaths().boardDirPath`
and rewriting it would regress CARD-023's AC-2. CARD-023's `ResolvedPaths` (`{boardDirPath, projectName}`)
carries no repo root and does not need to: `args.targetRepo` is already at the call site.

**Why `repoRoot` is required while CARD-027 makes `hub?` optional on the same interface:** omitting `hub`
has a *correct* default (a fresh `createSnapshotHub()`); `repoRoot` has none — every candidate default
(`resolve(boardDir,'..','..')`, `process.cwd()`) is a guess that produces zero docs silently. A compile
error at each call site is the cheap failure; a required field makes the illegal state unrepresentable.

## Data flow
`GET /api/cards/:id/docs` → route regex on `pathname` → `snapshot()` (default `buildSnapshot`) →
`cards.find(c => c.id === id)` → miss ⇒ `404 {"error":"not found"}` → hit ⇒
`resolveCardDocDirs({repoRoot, boardDir, dirName: card.dirName, worktree: card.worktree})` →
`readDocsFromDir(primary,'main-checkout')` + `readDocsFromDir(worktree,'worktree')` (each ENOENT → `[]`) →
`mergeDocs` (worktree wins, sorted) → `200 {docs}`. Any throw in the handler → `500 {"error":"internal
error"}` from the single handler-wide catch. Reads only; no writes, no outbound sockets, no schema or
migration impact. Response carries no absolute paths, consistent with [CARD-021]'s no-path-leak rule.

## Implementation task list
1. **Filename matcher + first read.** Modify `tsconfig.test.json` (`include` += `src/server/phase-docs.ts`
   — [CARD-019] TS6307). Create `src/server/phase-docs.test.ts` with failing
   `it('reads the six phase docs and both check-doc shapes, labeled main-checkout, ignoring other files')`:
   tmp dir holding `slice.md`…`deliver.md`, `slice-check.md`, `deliver-check-design.md`, `card.md`,
   `notes.md`, `design.md.bak`; assert `readDocsFromDir(dir,'main-checkout').map(d=>d.name)` toEqual the
   eight names in sorted order, `docs.find(d=>d.name==='design.md')!.content` toBe the literal fixture text,
   every `source` toBe `'main-checkout'`. Run (red). Implement `isCheckDocName`/`isPhaseDocName` +
   `PhaseDoc`/`DocSource`/`PhaseDocsResponse` in `card-model.ts` and `readDocsFromDir` in `phase-docs.ts`.
   Run (green). Refactor `parse-card.ts`'s `hasCheckDoc` to delegate; re-run the **whole** suite — the 36
   existing `parse-card` tests are the regression net. Commit.
2. **Reader totality.** Failing `it('degrades to [] for a missing dir and skips an entry it cannot read')`:
   `readDocsFromDir('<tmp>/nope','main-checkout')` toEqual `[]`; a dir containing a **directory** named
   `review.md` plus a real `test.md` → names toEqual `['test.md']`, no throw. Implement the two
   `try/catch`es. Green. Commit.
3. **Pure merge + property.** Failing `it('worktree entries replace primary entries of the same name')`
   (`mergeDocs([{name:'design.md',content:'MAIN',source:'main-checkout'}],[{name:'design.md',
   content:'WT',source:'worktree'}])` toEqual a single `{content:'WT',source:'worktree'}`) and
   `it('returns the sorted union, primary-only names keeping main-checkout')` (exact 3-element array,
   names `['design.md','implement.md','slice.md']`). Then
   `it('property: union, worktree precedence and sorted order hold for any name sets')` — fast-check over
   two `fc.uniqueArray` draws from a fixed 8-name doc pool with tagged contents,
   `{ seed: 20260721, numRuns: 100 }`; expected values derived from the **generated tags**, not from a
   retyped copy of the implementation ([CARD-020]): result names toEqual sorted union of the two input name
   sets, every name in the worktree draw has `source==='worktree'` and that draw's content, and
   `names` toEqual `[...names].sort(codepoint)`. Implement `mergeDocs`. Green. Commit.
4. **Worktree path derivation (the trap).** Failing `it('resolves the worktree card dir relative to the
   repo root, not the board dir')`: `resolveCardDocDirs({repoRoot:'/r', boardDir:'/r/docs/cards',
   dirName:'CARD-008-x', worktree:'.worktrees/CARD-008-x'})` toEqual
   `{primary:'/r/docs/cards/CARD-008-x', worktree:'/r/.worktrees/CARD-008-x/docs/cards/CARD-008-x'}` — the
   expected strings written out by hand — plus `expect(dirs.worktree).not.toContain('cards/.worktrees')`
   (the naive-join result), and a second case with `boardDir:'/r/board'` asserting
   `'/r/.worktrees/CARD-008-x/board/CARD-008-x'` (proves the moved-board-dir case). Then one folded
   `it('handles an unset and an absolute worktree value')`: `worktree:''` → `worktree` toBeUndefined;
   `worktree:'/elsewhere/wt'` → `'/elsewhere/wt/docs/cards/CARD-008-x'`. Implement. Green. Commit.
5. **Composition.** Failing `it('reads and merges both checkouts, and falls back to the primary when the
   worktree dir is absent')`: two real tmp dirs; `readPhaseDocs({primary,worktree})` → worktree content wins
   for the shared name and worktree-only doc present; then `readPhaseDocs({primary,
   worktree:'<tmp>/gone'})` → exactly the primary names. Implement `readPhaseDocs`. Green. Commit.
   **Stop here: `phase-docs.test.ts` is now 8 `it`s / ~180 lines — its hard cap.** This is also the split
   boundary (see Budget): tasks 1-5 ship a consumer-free module and stand alone.
6. **Endpoint happy path + `repoRoot` plumbing.** In `http-server.test.ts` add
   `describe('createServer GET /api/cards/:id/docs')`. Failing `it('returns 200 with the primary-checkout
   docs, labeled and sorted')` — AC-1 assertions above, plus `content-type` toBe
   `'application/json; charset=utf-8'`. Add `repoRoot` to `ServerOptions`, to **every** existing options
   literal (`repoRoot: boardDir` there — those tests never hit this route), to `index.ts` per Interfaces,
   and implement the route branch. Green. Commit.
   *Placement rationale:* these tests exercise `createServer`'s dispatch, so they belong beside the other
   route tests, in the same file CARD-006 established and CARD-023 keeps; the unit tests stay in
   `phase-docs.test.ts` because they need no server. *Harness:* `writeFixtureBoard`/`withServer` today,
   whose returned dir is the **repoRoot** (write files at `docs/cards/…`); if CARD-023 merged first they are
   `writeFixtureTree`/`withServer` imported from `test/board-fixture.ts` — an import + rename, no behaviour
   change. *Literal count:* six today (`http-server.test.ts:82,115,133,146,~160,195`) and **more by
   implementation time** (CARD-027 adds ~five) — count them then, do not trust six.
7. **Worktree merge + REQ-001 guard (AC-2/AC-3).** Failing `it('merges the card worktree checkout, which
   wins on conflict, without writing the repo')`: fixture writes
   `docs/cards/CARD-001-first/card.md` (frontmatter `worktree: .worktrees/CARD-001-first`) + `design.md`
   ='MAIN design' + `slice.md`, and `.worktrees/CARD-001-first/docs/cards/CARD-001-first/
   {design.md='WORKTREE design',implement.md}`; assert the three doc names, `design.md` content
   `'WORKTREE design'` with `source:'worktree'`, `implement.md` `source:'worktree'`, `slice.md`
   `source:'main-checkout'`. Wrap the request in `assertNoNonLoopbackNetwork(() =>
   assertNoRepoWrites(repoRoot, () => …))` — digesting the **repo root**, so a write into either checkout is
   caught (ADR-0011) — and assert the response text does not contain `repoRoot` ([CARD-021] no-path-leak).
   Wire `resolveCardDocDirs`+`readPhaseDocs` into the handler. Green. Commit.
8. **404 / traversal / 500 contract.** Failing `it('returns 404 for an unknown card id and for a
   traversal-shaped id')` (`/api/cards/CARD-999/docs` and `/api/cards/..%2F..%2Fetc/docs` → 404,
   `{error:'not found'}`, json content-type) and `it('a throwing snapshot provider yields 500 on the docs
   route with no message leak')` (inject `snapshot:()=>{throw new Error('boom')}`; status 500, body
   `{error:'internal error'}`, `not.toContain('boom')`). Implement the miss branch and hoist the existing
   `/api/board` `try/catch` to wrap the whole handler body. Green — confirm the CARD-006 500 test still
   passes. Commit.
9. **Fallback, all three shapes (AC-4).** Failing `it('falls back to the primary checkout when the worktree
   is unset or its card dir is absent, and returns an empty list for a doc-less card')`: one fixture, three
   cards — (a) `worktree: ""`; (b) `worktree: .worktrees/CARD-002-second` where that worktree root **exists
   on disk** (write `.worktrees/CARD-002-second/docs/cards/CARD-001-first/slice.md` so the root and board
   dir are real) but the card's **own** dir inside it is not — the normal in-flight shape; (c) a card whose
   primary dir holds only `card.md`. Assert (a) and (b) are 200 with exactly the primary doc names, (c) is
   200 with `body.docs` toEqual `[]`, and `JSON.stringify(body)` `not.toContain('error')` for all three.
   Green. Run `eslint .`, `tsc -b --noEmit`, `npm run build`, `vitest run --coverage`. Commit.

## Test strategy
- **Gates:** `eslint .`, `tsc -b --noEmit` ([CARD-001]: never plain `tsc --noEmit`), `npm run build`,
  `vitest run --coverage` all green. `phase-docs.ts` + the `card-model.ts` matchers meet the 90%
  coverage_target (lines/functions/branches/statements); `index.ts` and `test/**` stay excluded.
- **Independent expected values.** Doc contents are literal fixture strings (`'MAIN design'` /
  `'WORKTREE design'`), never re-derived from the reader. Task 4's path expectations are hand-written
  absolute strings, never a `path.join(...)` that restates the implementation — that is the whole point of
  that test. The property's ground truth comes from the arbitrary's generation tags.
- **Contract details asserted by name:** status 200/404/500; `content-type: application/json;
  charset=utf-8`; envelope key `docs`; fields `name`/`content`/`source`; the exact source literals
  `'main-checkout'`/`'worktree'`; `{"error":"not found"}` / `{"error":"internal error"}`; no `'boom'` leak;
  no absolute path in the body; `docs: []` for a doc-less card; ordering by name.
- **Negative/edge cases:** missing primary dir; unreadable entry (a directory named `review.md`);
  `worktree:''`; worktree root present but card dir absent; unknown card id; percent-encoded traversal id;
  `card.md`/`notes.md`/`design.md.bak` excluded; `deliver-check-design.md` **included** (a literal
  `*-check.md` glob would miss it — 8 such files exist in this repo).
- **Branch map:** `readDocsFromDir` readdir ok/throw + readFile ok/throw (task 2); `resolveCardDocDirs`
  set/empty/absolute (task 4); `mergeDocs` collision/no-collision (task 3); route found (6/7) / not-found
  (8) / unmatched (existing tests) / thrown (8). Coverage % alone does not prove a branch is observed.
- **Mutation → break map (per acceptance criterion):**
  - AC-1: drop `deliver-check-` from the check matcher → task 1's name list loses `deliver-check-design.md`.
  - AC-1: delete the `isPhaseDocName` filter → task 1 sees `card.md`/`notes.md`.
  - AC-2: `path.join(boardDir, worktree, dirName)` (the naive trap) → task 4's
    `not.toContain('cards/.worktrees')` + literal equality, and task 7's worktree doc vanishes.
  - AC-2: drop `path.relative(repoRoot, boardDir)` (assume `'docs/cards'`) → task 4's custom-boardDir case.
  - AC-2: swap merge order so primary wins → task 3 collision + property + task 7 (`'MAIN design'`).
  - AC-3: hardcode `source:'main-checkout'` → tasks 3/7 source assertions.
  - AC-1: remove the `.sort` → task 1's ordered `toEqual` + the property's sortedness.
  - AC-4: delete the `readdir` `try/catch` → tasks 2/9 throw → 500 instead of 200.
  - AC-4/ADR-0010: return 404 for a found card, or 200 for an unknown one → tasks 6 and 8.
  - ADR-0010: build the fs path from the URL `:id` instead of `card.dirName` → traversal case stops 404ing.
  - ADR-0010: delete the handler-wide `catch` → task 8's 500 case.
  - ADR-0011: make the handler write into the card dir → task 7's `assertNoRepoWrites(repoRoot, …)`.
  - *Honest gap:* replacing the codepoint comparator with `localeCompare` passes on both dev and CI today —
    guarded by the review note and a KNOWLEDGE entry, **not** claimed as mutation-covered.
- **Determinism:** fixed `now`, ephemeral `:0` port, loopback only, servers closed in `finally`, tmp dirs
  removed in `afterEach`, pinned fast-check seed (`20260721`, [CARD-021]), no network.
- **Budget (re-derived; the previous ~455 was wrong).** The design check re-derived the uncut design at
  **~516** against `size_limit: 500`, and showed slice.md's calibration undercounted its own comparators
  (`parse-card.test.ts` is **554** lines / 36 `it`s, not 458; `build-snapshot.test.ts` is **447** / 24, not
  362). Rates below come from the real files: 18.6 lines/`it` for fs-fixture unit tests, 24.3 for
  `http-server.test.ts` bodies ((218−72)/6).

  | file | ~516 baseline | this design | change |
  |---|---|---|---|
  | `card-model.ts` | 18 | 18 | |
  | `parse-card.ts` | 5 | 5 | |
  | `phase-docs.ts` | 85 | **78** | one contract jsdoc on `resolveCardDocDirs`, none on the other three |
  | `http-server.ts` | 33 | 33 | |
  | `index.ts` / `tsconfig.test.json` | 4 | 4 | |
  | `phase-docs.test.ts` | 195 (9 `it`s) | **180** (8) | task 4's unset + absolute cases folded into one `it` |
  | `http-server.test.ts` | 176 (6 `it`s) | **160** (5) | the standalone REQ-001-guard `it` is deleted; the guards + no-path-leak assertion wrap task 7's existing request, and task 9 covers all three AC-4 shapes in one `it` |
  | **total** | **~516** | **~478** | |

  478 clears the 500 cap by only 4%, and this repo's design→actual drift has run 1.16x–2x (CARD-006
  313→679, CARD-019 300→601). So the split boundary is **named now and pre-authorised**: if the running
  `git diff --stat` exceeds ~300 after task 5, or ~500 before task 9, stop and split at the task 5/6 line —
  **tasks 1-5** are `phase-docs.ts` + the `card-model.ts` matchers + their unit tests (~282 lines), a
  self-contained pure/fs module with no consumer (the [CARD-021] lead-slice shape), and **tasks 6-9** are
  the endpoint wiring (~196). Further pre-authorised trims, in order: task 4's absolute-worktree assertion
  (~8), task 3's second example-based merge `it` (~12, the property covers it). Never cut: the REQ-001
  guard wrap, the property test, the traversal case, or task 9's third shape.

## Spec references
- REQ-001 — never writes the target repo, never calls GitHub: `docs/spec.md:13-17` (enforced suite-wide per
  ADR-0011, not by this card's ACs).
- REQ-005 — phase docs live beside `card.md` but during flight are reachable via the frontmatter `worktree`
  path; enumerates the doc set: `docs/spec.md:47-52`.
- REQ-016 — `GET /api/board` (the sibling route this dispatch already serves): `docs/spec.md:123-126`.
- REQ-018 — `GET /api/cards/:id/docs`, on-demand, both locations, worktree wins, every doc labeled with its
  source: `docs/spec.md:134-139`.
- REQ-035 — missing worktree path falls back to the primary checkout; absent docs simply don't get a tab:
  `docs/spec.md:267-271`.
- ADR-0010 (`docs/adrs/0010-*`) — factory + `(method, pathname)` dispatch + JSON error contract, which this
  route extends. ADR-0011 (`docs/adrs/0011-*`) — the shared REQ-001 guard. ADR-0008 (`docs/adrs/0008-*`) —
  degrade-never-throw, the model `readDocsFromDir` follows.
- Sibling designs read for merge-order tolerance: CARD-023 `design.md` (`args.ts`, `ResolvedPaths`,
  `test/board-fixture.ts`), CARD-027 `design.md` (`ServerOptions.hub?`), CARD-006 `design.md`.
- `KNOWLEDGE.md` [CARD-004], [CARD-020], [CARD-020→CARD-011], [CARD-021], [CARD-019] (TS6307),
  [CARD-006] (`req.url`, loopback bind).

## Open questions
None.

## Proposed ADRs

### Server path context: an explicit repoRoot alongside boardDir, with worktree card dirs derived by relative board path
**Context:** CARD-008 must reach phase docs on the card's branch via the frontmatter `worktree` path
(REQ-005/REQ-018). `card.worktree` is repo-root-relative; `ServerOptions` (ADR-0010) carries only `boardDir`
(`<repo>/docs/cards` today), so the server has no notion of the repo root and `path.join(boardDir,
card.worktree)` resolves wrong — and fails **silently**, because a missing dir degrades to zero docs.
Deriving the repo root by walking `../..` up from `boardDir` would hard-code the very assumption CARD-023
(`--board-dir`, design PR open) is about to break. The repo root is already known at the one place a server
is constructed: `index.ts` has it as `resolve(argv[2])` today, and as `resolve(args.targetRepo)` from
`parseArgs`'s result once CARD-023 lands.

**Decision:** `ServerOptions` gains a **required** `repoRoot: string` (absolute). The card's worktree doc dir
is derived as `path.join(path.resolve(repoRoot, card.worktree), path.relative(repoRoot, boardDir),
card.dirName)` — a git worktree is a full checkout, so the board dir sits at the same repo-relative path
inside it; `path.resolve` also lets an absolute `worktree` value pass through untouched. No `..` walk from
`boardDir` anywhere in `src/server`. The value is supplied **at the `createServer` call site**, from
whatever expression yields the resolved repo root there at merge time; the board path is computed exactly as
that call site already computes it and is **not** rewritten by this change. CARD-023's `ResolvedPaths`
(`{boardDirPath, projectName}`) is not extended — it does not carry the repo root and does not need to. The
`:id` from the URL is never used to build a path: it is matched against `snapshot().cards[].id` and the path
comes from the parsed `card.dirName`, so no request input reaches the filesystem.

**Consequences:** Every `ServerOptions` construction site must state `repoRoot` — six literals in
`http-server.test.ts` today, more once CARD-023/CARD-027 land, plus `index.ts` — a one-time, compiler-guided
cost that makes the illegal state (a server that thinks it can find a worktree from the board dir alone)
unrepresentable. This is deliberately unlike CARD-027's optional `hub?` on the same interface: omitting
`hub` has a correct default, whereas every candidate default for `repoRoot` is a guess that yields zero docs
without an error. Merge order with CARD-023 is free in both directions: neither card reads the other's
module, and whichever lands second only adds/keeps one argument at the shared call site — the standing
instruction being that the board path stays as CARD-023 computes it (no reintroduced hardcoded
`docs/cards`). CARD-007's successors, CARD-009 and CARD-018's children inherit the field. Path traversal via
`:id` becomes structurally impossible rather than filtered. Harder: the derivation is defined only for a
board dir **inside** the repo root. A board dir that resolves elsewhere — an absolute `--board-dir`, which
CARD-023 explicitly accepts and pins with a test — makes `path.relative(repoRoot, boardDir)` `..`-prefixed
and the derived worktree dir meaningless; it will not exist, so the read degrades to primary-only docs with
no error and no wrong doc. Accepted on those terms: the failure mode is fewer docs, never wrong docs, never
a throw, and the operator who points the board outside its own repo has no worktree layout for us to infer.
Reversal means touching the shared server contract in every server card, hence the ADR. Extends ADR-0010;
supersedes nothing.
