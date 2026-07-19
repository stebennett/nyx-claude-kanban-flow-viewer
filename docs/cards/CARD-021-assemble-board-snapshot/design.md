# CARD-021 — Assemble a board snapshot from cards, config and parse errors — Design

## Intent
Build the board API's foundational read: the crash-proof board walk. For each
`<boardDir>/CARD-*/` directory, do a single `readdir`, read `card.md`, and call the
CARD-019/020 `parseCard(raw, { dirName, entries })`; read `config.md` for `wipLimit`;
assemble the REQ-019 snapshot `{ generatedAt, projectName, config, cards, parseErrors }`.
A malformed `card.md` (or `config.md`) degrades into `parseErrors` — one bad file never
crashes the board (REQ-033). Milestones are the sibling CARD-022.

## Acceptance criteria
1. `buildSnapshot` returns an object carrying `generatedAt` (ISO string), `projectName`
   (the target repo's basename, supplied by the caller), `config`, `cards`, and
   `parseErrors`, and no `milestones` key (REQ-019; milestones are CARD-022's).
2. `config.wipLimit` is read from `config.md` frontmatter `wip_limit` (REQ-003); absent
   config.md / missing / non-numeric `wip_limit` → `DEFAULT_WIP_LIMIT` (3); `wip_limit: 0`
   passes through.
3. A malformed `card.md` lands in `parseErrors` with a board-relative `path` and a
   non-empty `error` string while every other card in the walk still parses (REQ-033).

## In scope
- `src/server/build-snapshot.ts`: `buildSnapshot(options)` — the walk, config read, and
  assembly; `DEFAULT_WIP_LIMIT`. First `fs` access in the domain layer (server-only).
- `src/server/card-model.ts`: `BoardSnapshot`, `BoardConfig`, `ParseError` types.
- `src/server/build-snapshot.test.ts`: fixture-board helper + suite.
- `tsconfig.test.json`: register `src/server/build-snapshot.ts` (TS6307 trap).

## Out of scope
- Milestones / `MILESTONES.md` (CARD-022 — the additive `milestones` seam is noted below).
- The HTTP server (CARD-006), SSE stream (CARD-007), startup path validation (REQ-014).
- Serving anything; watching the filesystem; any BOARD.md read (REQ-002 — ignored).

## Dependencies & assumptions
- Depends on `parseCard` (CARD-019) and its `entries`-driven `phaseDocsPresent` (CARD-020).
- **Assumption:** `boardDir` exists when called — REQ-014's startup validation owns that
  precondition. `readdirSync(boardDir)` may throw ENOENT if it later vanishes; that
  watch-time race is CARD-007's concern, not degraded here (see the proposed ADR).
- `projectName` is passed in (basename of the repo path from the CLI/REQ-012 resolution),
  not derived from `boardDir` (whose basename is `cards`, not the project name). Keeps
  buildSnapshot's fs surface to exactly the board dir (I/O at the edges).

## Approach
Synchronous walk (readdir/readFileSync) — a board of tens of cards makes cost negligible
(REQ-008), and sync matches parse-card's plain-data style. Order: read config (guarded),
then list + **sort** `CARD-*` dirs, then per dir a single `readdir` → skip if no `card.md`
→ read `card.md` → `try parseCard(raw, {dirName, entries}) catch → parseErrors`. Sorting
yields a deterministic `cards`/`parseErrors` order for stable client diffing (REQ-009).
- *Alternatives rejected:* (a) **async fs** — no concurrency win at this scale, adds await
  noise; YAGNI. (b) **let parseCard self-heal malformed YAML** — rejected by ADR-0005/
  KNOWLEDGE [CARD-019]: the parser is pure and deliberately not total; the walk owns the
  safety net (REQ-033). (c) **absolute parseError paths** — non-deterministic (embed the
  tmp/checkout dir) and leak filesystem layout into the JSON API; use board-relative.

## Interfaces
`src/server/card-model.ts` (append):
```ts
export interface BoardConfig { wipLimit: number; }
export interface ParseError { path: string; error: string; }
export interface BoardSnapshot {
  generatedAt: string;          // now().toISOString()
  projectName: string;          // caller-supplied repo basename (REQ-019)
  config: BoardConfig;
  cards: CardModel[];           // sorted by dirName
  parseErrors: ParseError[];    // config.md first (if any), then card dirs, sorted
  // CARD-022 adds `milestones: Milestone[]` here additively — not this card.
}
```
`src/server/build-snapshot.ts`:
```ts
export const DEFAULT_WIP_LIMIT = 3;
export interface BuildSnapshotOptions {
  boardDir: string;             // absolute path to <repo>/<board-dir>
  projectName: string;
  now?: () => Date;             // injectable clock; default () => new Date()
}
export function buildSnapshot(options: BuildSnapshotOptions): BoardSnapshot;
// private: readConfig(boardDir, parseErrors) -> BoardConfig  (ENOENT -> default silently;
//   matter() throws -> parseErrors.push({path:'config.md',error}) + default)
// private: asWipLimit(v) -> number  (finite non-neg number ? v : DEFAULT_WIP_LIMIT)
// private: errorMessage(err) -> string  (err instanceof Error ? err.message : String(err))
```

## Data flow
`buildSnapshot` → `readConfig(boardDir)` (guarded gray-matter read of `config.md`) →
`readdirSync(boardDir, {withFileTypes})` → filter `isDirectory() && name.startsWith('CARD-')`
→ `.sort()` → per dir: `readdirSync(cardDir)` (the single CARD-020 readdir; base filenames
become `entries`) → `if (!entries.includes('card.md')) continue` → `readFileSync(card.md)` →
`try { cards.push(parseCard(raw, {dirName, entries})) } catch { parseErrors.push(...) }` →
return `{ now().toISOString(), projectName, config, cards, parseErrors }`. No schema/migration
impact. parseError `path` built as `` `${dirName}/card.md` `` (forward-slash literal).

## Implementation task list
1. **Types + module skeleton + happy path (AC-1).** Modify `card-model.ts` (add the three
   types); create `build-snapshot.test.ts` with a `writeFixtureBoard(files: Record<string,
   string>): string` helper (mkdtempSync under os.tmpdir; recursive mkdir/write; afterEach
   rmSync) + test `assembles a snapshot from a valid board`: 2 valid card dirs +
   config.md(`wip_limit: 2`), assert keys present, `projectName` equals the passed value,
   `cards.length === 2`, `parseErrors` `toEqual([])`, and `expect(snap).not.toHaveProperty
   ('milestones')`. Run → red (no module). Implement `buildSnapshot` (walk + readConfig +
   assembly, **no try/catch yet, `new Date()` inline**); create `build-snapshot.ts`; add it
   to `tsconfig.test.json` include. Run test + `tsc -b --noEmit` → green. Commit.
2. **generatedAt determinism (AC-1).** Tests: `uses the injected clock` — `now: () => new
   Date('2026-07-18T12:00:00.000Z')`, assert `generatedAt === '2026-07-18T12:00:00.000Z'`;
   `defaults to a valid ISO now` — no `now`, assert `new Date(snap.generatedAt).toISOString()
   === snap.generatedAt`. Red → add `now?` option + `.toISOString()`. Green. Commit.
3. **config.wipLimit variants (AC-2).** Tests, each its own fixture: `wip_limit: 5` → 5;
   config.md absent → `DEFAULT_WIP_LIMIT`; config.md present without `wip_limit` → default;
   `wip_limit: "three"` → default; `wip_limit: 0` → 0. Red → add `readConfig` + `asWipLimit`
   branches (each asserted per KNOWLEDGE [CARD-019] coverage note). Green. Commit.
4. **Malformed card → parseErrors, others parse (AC-3, REQ-033).** Tests: 3 dirs, one with
   an unterminated-quote frontmatter → `cards.map(c=>c.id)` contains the two good ids and not
   the bad one, `parseErrors.length === 1`, `parseErrors[0].path === '<baddir>/card.md'`,
   `typeof error === 'string' && error.length > 0`, and `expect(path).not.toContain(boardDir)`
   (board-relative, no leak); `two malformed dirs → two entries, sorted by path, one good card`.
   Red (throws) → wrap `parseCard` in try/catch routing to `parseErrors`. Green. Commit.
5. **Malformed config.md degrades (robustness).** Test: malformed config.md + 1 good card →
   `cards.length === 1`, `config.wipLimit === DEFAULT_WIP_LIMIT`, `parseErrors` contains
   `{ path: 'config.md', error: <non-empty> }`. Red (matter throws) → guard `readConfig`'s
   `matter` call. Green. Commit.
6. **CARD-* dir without card.md is skipped (edge).** Test: a `CARD-099-stub` dir with no
   card.md + 1 good card → `cards.length === 1`, `parseErrors` `toEqual([])`. Red (ENOENT) →
   add the `entries.includes('card.md')` guard. Green. Commit.
7. **entries thread to parseCard (CARD-020 contract).** Test: a card dir containing `card.md`
   + `design.md` → `cards[0].phaseDocsPresent.design.phase === true`. Red → pass
   `entries: dirEntries` to `parseCard`. Green. Commit.
8. **Determinism + ignores (AC-1 hardening).** Tests: dirs created CARD-003/001/002 →
   `cards.map(c=>c.dirName)` is ascending-sorted; a board with `BOARD.md`/`MILESTONES.md`/
   `KNOWLEDGE.md`/`adrs/` + 1 card → those ignored, `cards.length === 1`; empty board (only
   config.md) → `cards` `[]`, `parseErrors` `[]`. Red where sort/filter missing → add `.sort()`
   / tighten the filter. Green. Commit.
9. **Property: no card is ever lost (REQ-033 invariant).** fast-check: generate a list of
   dir specs each tagged `valid | malformed` (2–6 dirs), build the board, assert
   `cards.length === (#valid)` and `parseErrors.filter(e=>e.path.endsWith('/card.md')).length
   === (#malformed)` and their union covers every dir exactly once — expected counts derived
   from the tags, never from the impl. Green (already satisfied by task 4's try/catch; this
   generalizes it and guards the accounting). Commit.

## Test strategy
Vitest, co-located `build-snapshot.test.ts` with a temp fixture-board helper (real dirs, no
mocks — domain logic is pure over plain fs data). Coverage ≥90% on `src/server`
(lines/functions/branches). **Assertions computed independently of the impl:** exact injected
ISO string (task 2), `wipLimit` literals incl. the 0-vs-default boundary (task 3, each branch
its own asserted fixture per KNOWLEDGE [CARD-019]), exact board-relative parseError path +
the `not.toContain(boardDir)` no-leak check (task 4), the missing-`milestones` scope lock
(task 1). **Mutation → failing test:** delete the card `try/catch` → tasks 4/9 throw; delete
the config guard → task 5 throws; flip `DEFAULT_WIP_LIMIT` → task 3; drop `.sort()` → task 8;
omit `entries` → task 7; drop the `card.md` guard → task 6; hardcode `generatedAt` → task 2.
Property test earns its keep on the REQ-033 accounting invariant (every card dir lands in
exactly one of cards/parseErrors). **Watch item:** `errorMessage`'s `String(err)` else-branch
is defensive (gray-matter always throws `Error`) — one uncovered branch among many keeps the
file >90%; do not fabricate a non-Error throw to cover it (KNOWLEDGE [CARD-019] dead-branch
note). Gates: `tsc -b --noEmit` (not plain `tsc`, KNOWLEDGE [CARD-001]) + ESLint must pass.

## Spec references
- REQ-019 (snapshot shape), REQ-003 (config `wip_limit`), REQ-033 (malformed card.md never
  crashes), REQ-002 (untrusted frontmatter; BOARD.md ignored), REQ-014 (board-dir precondition,
  out of scope here), REQ-008/009 (full re-parse; deterministic order for client diffing),
  REQ-020 (CardModel — via ADR-0005).
- ADR-0005 (card model shape / explicit mapping / parseCard pure-but-not-total).
- KNOWLEDGE [CARD-019] (parseCard not total; TS6307 tsconfig.test.json include; per-branch
  coverage; dead-branch cost), [CARD-020] (single readdir; `entries` contract; JSON-contract
  types belong in dependency-free card-model.ts).

## Proposed ADRs
### The board walk is a total function: buildSnapshot degrades all file and parse failures into the snapshot, never throws
**Context.** parse-card (ADR-0005) is pure but NOT total — `matter()` throws a `YAMLException`
on malformed frontmatter (KNOWLEDGE [CARD-019]). `card.md` and `config.md` are untrusted
(REQ-002); REQ-033 mandates a malformed `card.md` never crash the board. `buildSnapshot` is
the single board read consumed by `GET /api/board` (CARD-006) and the SSE watcher (CARD-007),
which re-parses on every debounced change (REQ-008) — if it throws, one bad file kills the
live board and every reconnect.
**Decision.** For any contents of an EXISTING board directory, `buildSnapshot` never throws.
Every per-card parse failure and a malformed `config.md` route to `snapshot.parseErrors`
(`{path, error}`); a card dir missing `card.md` is skipped; a valid card always parses
regardless of sibling failures; an absent `config.md` degrades silently to the default config
(REQ-014 permits a board of only cards). A missing board directory is the one uncaught case —
a precondition owned by REQ-014's startup validation, not this function.
**Consequences.** CARD-006/007 call `buildSnapshot` without wrapping it in try/catch; the live
board is immune to a single bad file including `config.md`. `parseErrors` becomes the single
tray for every degradation, so its `{path, error}` shape (board-relative path, string message)
is now a cross-cutting contract. Cost: a wholesale-broken board renders sparse/empty rather
than erroring loudly — mitigated by REQ-014's startup check. Complements ADR-0005 (parser pure
but explicitly not total).
