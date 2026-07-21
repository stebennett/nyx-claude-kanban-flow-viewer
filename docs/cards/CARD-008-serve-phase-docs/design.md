# CARD-008 — Serve a card's phase docs · design

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
  doc existing in **both** returns the **worktree** content with `source:'worktree'`. Observable: fixture
  writes `design.md` = `"MAIN design"` under `<repo>/docs/cards/<dir>/` and `design.md` = `"WORKTREE design"`
  + `implement.md` under `<repo>/.worktrees/<slug>/docs/cards/<dir>/`; response contains
  `{name:'design.md',content:'WORKTREE design',source:'worktree'}` and `implement.md` with `source:'worktree'`.
- **AC-3 (REQ-018 · spec.md:134-139):** every returned doc carries `source`, exactly one of
  `'main-checkout'` | `'worktree'`. Observable: in the AC-2 fixture the primary-only `slice.md` carries
  `source:'main-checkout'`; `docs.every(d => d.source==='main-checkout'||d.source==='worktree')` is true;
  no doc has an absent/empty `source`.
- **AC-4 (REQ-035 · spec.md:267-271):** `worktree: ""` (unset) **or** a `worktree` path that does not exist
  on disk both yield `200` with only the primary-checkout docs and **no** error. Observable: two requests in
  one test — one card with `worktree: ""`, one with `worktree: .worktrees/gone` — both `status===200`,
  both `docs` equal to the primary set, neither body containing `error`. A card dir with no phase docs at
  all returns `200 {docs:[]}`; an **unknown** card id returns `404 {"error":"not found"}` (ADR-0010).

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
- SSE/watcher (`/api/events`) → CARD-007; SPA `GET /` → CARD-009; CLI flags incl. `--board-dir` → CARD-023.
- Any caching, ETag/If-None-Match, pagination, or size cap on doc content — docs are re-read per request
  (REQ-018 says "on-demand"); a local read-only server needs none of it (YAGNI).
- Markdown parsing/sanitising, `card.md` itself, and non-phase files in the card dir.
- Depending on CARD-023's `resolvePaths` module (unmerged) — this card introduces only the `repoRoot`
  option field CARD-023 will populate.

## Dependencies & assumptions
- CARD-006 merged: `createServer(options)` factory + JSON error contract (ADR-0010), `test/server-guard.ts`
  (ADR-0011), `writeFixtureBoard`/`withServer` **private to `http-server.test.ts`** — reusable only from a
  `describe` in that same file, which is why the endpoint tests live there and the unit tests do not.
- `buildSnapshot` is total (ADR-0008); `CardModel` already carries `dirName` and `worktree`.
- A `git worktree` checkout is a **full** checkout, so the board dir sits at the same repo-relative path
  inside it. If it doesn't, `readdirSync` throws ENOENT and we degrade to the primary docs (AC-4) — the
  assumption fails safe.
- `card.worktree` is repo-root-relative; an absolute value would also work via `path.resolve`.
- Node 20+, ESM (ADR-0001); `fast-check` is a devDependency and property seeds are pinned ([CARD-021]).

## Approach
Domain logic is pure over plain data, fs is at one edge, and the response contract is a dependency-free
type the UI can `import type` ([CARD-021]):

1. `resolveCardDocDirs` — **pure string math**, holds the worktree trap (see ADR below).
2. `readDocsFromDir(dir, source)` — the only fs edge; total (`readdir` failure → `[]`, per-file read
   failure → skip), mirroring ADR-0008's degrade-never-throw stance.
3. `mergeDocs(primary, worktree)` — pure: union keyed by `name`, worktree entry replaces primary, output
   sorted by name with a **codepoint** comparator (not `localeCompare`, whose order is ICU-dependent).
4. `readPhaseDocs(dirs)` — thin composition of 2+3.

Route: `GET /api/cards/:id/docs` matched by `/^\/api\/cards\/([^/]+)\/docs$/` against `url.pathname`; the
captured id is compared against `snapshot().cards[].id` and **never used to build a path** — the path comes
from the matched card's `dirName`, so traversal (`..%2F..%2Fetc`) is structurally impossible and simply
404s. The id is **not** `decodeURIComponent`'d: card ids are ASCII `CARD-NNN`, and decoding a malformed
`%` would throw `URIError` and turn a bad id into a 500.

**Alternatives considered.** (a) *Read docs during `buildSnapshot` and ship them inside the board
snapshot* — rejected: REQ-018 says on-demand; it would put every card's full doc text in every SSE frame
(CARD-007), and REQ-019's snapshot shape doesn't carry them. (b) *Derive the repo root inside
`phase-docs.ts` as `resolve(boardDir,'..','..')`* — rejected: re-encodes the exact assumption CARD-023
breaks, and fails silently (missing dir → zero docs) rather than loudly. (c) *Duplicate a 6-line filename
matcher locally in `phase-docs.ts`* (the slice estimate's shape) — rejected: KNOWLEDGE [CARD-004]/[CARD-020]
says reuse the canonical set, and drift between the presence scan and this endpoint means the UI shows a
tab with no content. Hoisting costs ~+15 lines net and makes disagreement impossible.
(d) *`readdirSync(..., {withFileTypes:true})` + `isFile()`* — rejected: a symlinked doc reports as neither
file nor dir; plain `readdir` + a `try/catch` around `readFileSync` handles directories (EISDIR), vanished
files and symlinks in one branch.

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
`index.ts`: `const repoRoot = resolve(targetRepo); const boardDir = resolve(repoRoot, 'docs/cards');`
then `createServer({ boardDir, repoRoot, projectName })`.

## Data flow
`GET /api/cards/:id/docs` → route regex on `pathname` → `snapshot()` (default `buildSnapshot`) →
`cards.find(c => c.id === id)` → miss ⇒ `404 {"error":"not found"}` → hit ⇒
`resolveCardDocDirs({repoRoot, boardDir, dirName: card.dirName, worktree: card.worktree})` →
`readDocsFromDir(primary,'main-checkout')` + `readDocsFromDir(worktree,'worktree')` (each ENOENT → `[]`) →
`mergeDocs` (worktree wins, sorted) → `200 {docs}`. Any throw in the handler → `500 {"error":"internal
error"}` from the single handler-wide catch. Reads only; no writes, no outbound sockets, no schema or
migration impact. Response carries no absolute paths (only `name`/`content`/`source`), consistent with
[CARD-021]'s no-path-leak rule.

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
   `it('returns the sorted union, primary-only names keeping main-checkout')` (asserting an exact 3-element
   array with names `['design.md','implement.md','slice.md']`). Then
   `it('property: union, worktree precedence and sorted order hold for any name sets')` — fast-check over
   two `fc.uniqueArray` draws from a fixed 8-name doc pool with tagged contents,
   `{ seed: 20260721, numRuns: 100 }`; expected values derived from the **generated tags**, not from a
   retyped copy of the implementation expression ([CARD-020]): result names toEqual sorted union of the two
   input name sets, every name in the worktree draw has `source==='worktree'` and that draw's content, and
   the result is sorted (`names` toEqual `[...names].sort(codepoint)`). Implement `mergeDocs`. Green. Commit.
4. **Worktree path derivation (the trap).** Failing `it('resolves the worktree card dir relative to the
   repo root, not the board dir')`: `resolveCardDocDirs({repoRoot:'/r', boardDir:'/r/docs/cards',
   dirName:'CARD-008-x', worktree:'.worktrees/CARD-008-x'})` toEqual
   `{primary:'/r/docs/cards/CARD-008-x', worktree:'/r/.worktrees/CARD-008-x/docs/cards/CARD-008-x'}` — the
   expected strings written out by hand — plus `expect(dirs.worktree).not.toContain('cards/.worktrees')`
   (the naive-join result), and a second case with `boardDir:'/r/board'` asserting
   `'/r/.worktrees/CARD-008-x/board/CARD-008-x'` (proves the CARD-023 case).
   `it('returns no worktree dir when worktree is unset')` (`worktree:''` → `worktree` toBeUndefined).
   `it('passes an absolute worktree path through unchanged')` (`worktree:'/elsewhere/wt'` →
   `'/elsewhere/wt/docs/cards/CARD-008-x'`). Implement. Green. Commit.
5. **Composition.** Failing `it('reads and merges both checkouts, and falls back to the primary when the
   worktree dir is absent')`: two real tmp dirs; `readPhaseDocs({primary,worktree})` → worktree content wins
   for the shared name and worktree-only doc present; then `readPhaseDocs({primary,
   worktree:'<tmp>/gone'})` → exactly the primary names. Implement `readPhaseDocs`. Green. Commit.
   **Stop here: `phase-docs.test.ts` is now 9 `it`s / ~165 lines — its hard cap.**
6. **Endpoint happy path + `repoRoot` plumbing.** In `http-server.test.ts` add
   `describe('createServer GET /api/cards/:id/docs')`, reusing the file's private `writeFixtureBoard`
   (its returned dir is used as the **repoRoot**, with files written at `docs/cards/…`) and `withServer`.
   Failing `it('returns 200 with the primary-checkout docs, labeled and sorted')` — AC-1 assertions above,
   plus `content-type` toBe `'application/json; charset=utf-8'`. Add `repoRoot` to `ServerOptions` and to
   the six existing options literals (`repoRoot: boardDir` there — those tests never hit this route), to
   `index.ts`, and implement the route branch. Green. Commit.
7. **Worktree merge through the endpoint (AC-2/AC-3).** Failing `it('merges the card worktree checkout,
   which wins on conflict')`: fixture writes `docs/cards/CARD-001-first/card.md` (frontmatter
   `worktree: .worktrees/CARD-001-first`) + `design.md`='MAIN design' + `slice.md`, and
   `.worktrees/CARD-001-first/docs/cards/CARD-001-first/{design.md='WORKTREE design',implement.md}`; assert
   the three doc names, `design.md` content `'WORKTREE design'` with `source:'worktree'`, `implement.md`
   `source:'worktree'`, `slice.md` `source:'main-checkout'`. Wire `resolveCardDocDirs`+`readPhaseDocs` into
   the handler. Green. Commit.
8. **404 / traversal / 500 contract.** Failing `it('returns 404 for an unknown card id and for a
   traversal-shaped id')` (`/api/cards/CARD-999/docs` and `/api/cards/..%2F..%2Fetc/docs` → 404,
   `{error:'not found'}`, json content-type) and `it('a throwing snapshot provider yields 500 on the docs
   route with no message leak')` (inject `snapshot:()=>{throw new Error('boom')}`; status 500, body
   `{error:'internal error'}`, `not.toContain('boom')`). Implement the miss branch and hoist the existing
   `/api/board` `try/catch` to wrap the whole handler body. Green — confirm the CARD-006 500 test still
   passes. Commit.
9. **Fallback + REQ-001 guard (AC-4).** Failing `it('falls back to the primary checkout when worktree is
   unset or missing')`: two cards in one fixture, `worktree: ""` and `worktree: .worktrees/gone`; both
   requests 200 with exactly the primary doc names, `JSON.stringify(body)` `not.toContain('error')`. Then
   `it('serves docs without writing the repo or leaving loopback')`: wrap the worktree-merge request in
   `assertNoNonLoopbackNetwork(() => assertNoRepoWrites(repoRoot, () => …))` — digesting the **repo root**,
   so a write into either checkout is caught (ADR-0011) — and assert the response text does not contain
   `repoRoot` (no absolute-path leak, [CARD-021]). Green. Run `eslint .`, `tsc -b --noEmit`, `npm run build`,
   `vitest run --coverage`. Commit.

## Test strategy
- **Gates:** `eslint .`, `tsc -b --noEmit` ([CARD-001]: never plain `tsc --noEmit`), `npm run build`,
  `vitest run --coverage` all green. `phase-docs.ts` + the `card-model.ts` matchers meet the 90%
  coverage_target (lines/functions/branches/statements); `index.ts` and `test/**` stay excluded.
- **Independent expected values.** Doc contents are literal fixture strings written by the test
  (`'MAIN design'` / `'WORKTREE design'`), never re-derived from the reader. Path expectations in task 4 are
  hand-written absolute strings, never `path.join(...)` recomputed the way the implementation does — that is
  the whole point of that test. The property's ground truth comes from the arbitrary's generation tags.
- **Contract details asserted by name:** status 200/404/500; `content-type: application/json; charset=utf-8`;
  the response envelope key `docs`; the field names `name`/`content`/`source`; the exact source literals
  `'main-checkout'`/`'worktree'`; `{"error":"not found"}` / `{"error":"internal error"}`; no `'boom'` leak;
  no absolute path in the body; `docs: []` for a doc-less card; ordering by name.
- **Negative/edge cases:** missing primary dir; unreadable entry (a directory named `review.md`);
  `worktree:''`; worktree path present in frontmatter but absent on disk; unknown card id; percent-encoded
  traversal id; `card.md`/`notes.md`/`design.md.bak` excluded; `deliver-check-design.md` **included**
  (a literal `*-check.md` glob would miss it — the case the card's Notes calls out).
- **Branch coverage map:** `readDocsFromDir` readdir-ok / readdir-throw (task 2) and readFile-ok /
  readFile-throw (task 2); `resolveCardDocDirs` worktree-set / worktree-empty / absolute (task 4);
  `mergeDocs` collision / no-collision (task 3); route matched-and-found (task 6/7) / matched-not-found
  (task 8) / unmatched (existing 404 tests) / thrown (task 8).
- **Property test (invariant, earns its keep):** merge is a union with worktree precedence and total sorted
  order — a bounded 8-name pool keeps the strategy inside the valid domain; seed pinned per [CARD-021].
- **Mutation → break map:**
  - Drop `deliver-check-` from the check-doc matcher (leave only exact `-check.md`) → task 1 name list is
    missing `deliver-check-design.md` → red.
  - Delete the `isPhaseDocName` filter entirely → task 1 sees `card.md`/`notes.md` → red.
  - `path.join(boardDir, worktree, dirName)` (the naive trap) → task 4's `not.toContain('cards/.worktrees')`
    and the literal equality → red; task 7's worktree doc vanishes → red.
  - Drop `path.relative(repoRoot, boardDir)` (assume `'docs/cards'`) → task 4's custom-boardDir case → red.
  - Swap merge order so primary wins → task 3 collision case + property + task 7 (`'MAIN design'`) → red.
  - Hardcode `source:'main-checkout'` → tasks 3/7 source assertions → red.
  - Remove the `.sort` → task 1's ordered `toEqual` + the property's sortedness → red.
  - Replace the codepoint comparator with `localeCompare` → passes locally by design; guarded instead by
    the review note + KNOWLEDGE entry, not claimed as mutation-covered (honest gap).
  - Delete the `readdir` `try/catch` → tasks 2/9 throw → 500 instead of 200 → red.
  - Return `404` for a found card / `200` for an unknown one → tasks 6 and 8 → red.
  - Build the fs path from the URL `:id` instead of `card.dirName` → the traversal case stops 404ing → red.
  - Delete the handler-wide `catch` → task 8's 500 case → red.
  - Make the handler write a file into the card dir → task 9's `assertNoRepoWrites(repoRoot, …)` → red.
- **Determinism:** fixed `now`, ephemeral `:0` port, loopback only, servers closed in `finally`, tmp dirs
  removed in `afterEach`, pinned fast-check seed, no network.
- **Budget:** bottom-up ~455 lines (card-model +20, parse-card +5, phase-docs.ts ~72, http-server.ts +30,
  index.ts +2, tsconfig +1, phase-docs.test.ts ~165, http-server.test.ts ~160) against `estimated_lines`
  460 / `size_limit` 500 — the hoisted matcher (+15 net) is paid for by not duplicating it and by the shared
  `try/catch`. If implementation trends over, the named cut is task 4's absolute-worktree case (record it);
  never the REQ-001 guard wrap, the property test, or the traversal case.

## Spec references
- REQ-001 — never writes the target repo, never calls GitHub: `docs/spec.md:13-17` (enforced suite-wide per
  ADR-0011, not by this card's ACs — card Notes).
- REQ-005 — phase docs live beside `card.md` but during flight are reachable via the frontmatter `worktree`
  path; enumerates the doc set: `docs/spec.md:47-52`.
- REQ-016 — `GET /api/board` (the sibling route this dispatch already serves): `docs/spec.md:123-126`.
- REQ-018 — `GET /api/cards/:id/docs`, on-demand, both locations, worktree wins, every doc labeled with its
  source: `docs/spec.md:134-139`.
- REQ-035 — missing worktree path falls back to the primary checkout; absent docs simply don't get a tab:
  `docs/spec.md:267-271`.
- ADR-0010 (`docs/adrs/0010-*`) — factory + `(method, pathname)` dispatch + JSON error contract, which this
  route extends. ADR-0011 (`docs/adrs/0011-*`) — the shared REQ-001 guard this card must adopt.
- ADR-0008 (`docs/adrs/0008-*`) — degrade-never-throw, the model `readDocsFromDir` follows.
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
(`--board-dir`, repo-relative, in flight) is about to break. `index.ts` already knows the true repo root:
`argv[2]`.
**Decision:** `ServerOptions` gains a **required** `repoRoot: string` (absolute). The card's worktree doc dir
is derived as `path.join(path.resolve(repoRoot, card.worktree), path.relative(repoRoot, boardDir),
card.dirName)` — a git worktree is a full checkout, so the board dir sits at the same repo-relative path
inside it; `path.resolve` also lets an absolute `worktree` value pass through untouched. No `..` walk from
`boardDir` anywhere in `src/server`. `index.ts` supplies `repoRoot = resolve(argv[2])` and `boardDir =
resolve(repoRoot, 'docs/cards')`; CARD-023 changes only the second expression. The `:id` from the URL is
never used to build a path — it is matched against `snapshot().cards[].id` and the path comes from the
parsed `card.dirName`, so no request input reaches the filesystem.
**Consequences:** Every `ServerOptions` construction site must state `repoRoot` (six existing literals in
`http-server.test.ts`, plus `index.ts`) — a one-time cost that makes the illegal state (a server that thinks
it can find a worktree from the board dir alone) unrepresentable. CARD-023 can move the board dir freely;
CARD-007/009/018 inherit the field. Path traversal via `:id` is structurally impossible rather than filtered.
Harder: a board dir outside the repo root makes `path.relative` `..`-prefixed and the worktree derivation
meaningless — accepted and out of contract (CARD-023's flag is repo-relative). Reversal means touching the
shared server contract in every server card, hence the ADR. Extends ADR-0010; supersedes nothing.
