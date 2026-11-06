## CARD-008 — design: Serve a card's phase docs   [feature · api]

### Why
The detail panel (CARD-016) is only useful during flight, and during flight most phase docs exist
**only on the card's branch** — not in the primary checkout. REQ-018 therefore asks for
`GET /api/cards/:id/docs` to read both locations, let the worktree copy win, and label every doc with
where it came from. This design adds that route to the dispatch CARD-006 established.

### Design summary
- **The worktree path trap is the card, and it is resolved explicitly.** `card.worktree` is
  *repo-root-relative* (`.worktrees/CARD-008-…`) while `ServerOptions.boardDir` is `<repo>/docs/cards`,
  so the obvious `path.join(boardDir, card.worktree)` resolves to a directory that does not exist — and
  fails **silently**, returning zero docs that read as "this card has no worktree docs". The card dir is
  derived instead as `join(resolve(repoRoot, card.worktree), relative(repoRoot, boardDir), card.dirName)`,
  which the design check verified against the two live worktrees on this machine.
- **`ServerOptions` gains a required `repoRoot`** rather than an optional field defaulting to a `../..`
  walk — that default would re-encode the exact assumption CARD-023 is about to break, and every other
  candidate default is a guess that yields zero docs without an error.
- **Pure domain, one fs edge.** `resolveCardDocDirs` is string math; `readDocsFromDir` is the only
  filesystem call and is total (ENOENT → `[]`, unreadable entry → skipped); `mergeDocs` is pure and gets
  a fast-check property. Sorting uses a **codepoint** comparator, not `localeCompare`, whose ICU order
  can differ between a macOS dev box and the ubuntu CI runner.
- **The filename matcher is hoisted once into `card-model.ts`** and `parse-card.ts`'s `hasCheckDoc`
  delegates to it, so the doc set this endpoint returns can never disagree with what `phaseDocsPresent`
  reports. Note a literal `*-check.md` glob would be wrong: `deliver-check-design.md` is a real filename
  here (8 instances).
- **No request input reaches the filesystem.** The `:id` is matched against `snapshot().cards[].id` and
  the path comes from the parsed `card.dirName`, so traversal is structurally impossible rather than
  filtered.

### Acceptance criteria (sharpened)
- **AC-1 (REQ-005/REQ-018, `spec.md:47-52,134-139`)** — the eight phase-doc patterns in the primary card
  dir are returned, sorted, each labeled `main-checkout`; `card.md` and non-doc files are not.
- **AC-2 (REQ-005/REQ-018)** — a doc present only in the worktree is returned with `source:'worktree'`,
  and a doc present in **both** returns the worktree content.
- **AC-3 (REQ-018)** — every doc carries `source`, exactly one of `main-checkout` | `worktree`.
- **AC-4 (REQ-035, `spec.md:267-271`)** — an unset `worktree`, a worktree whose card dir is absent, and a
  card with no phase docs at all all return `200` with no error; an unknown card id returns `404`.

### ADRs in this PR
- **ADR-0013 — Server path context: an explicit `repoRoot` alongside `boardDir`, with worktree card dirs
  derived by relative board path.** Extends ADR-0010; supersedes nothing.

### Open questions / decisions deferred
The designer raised none. Five things a reviewer should know:

1. **This card was reworked once.** The first design's ADR asserted a CARD-023 compatibility that
   CARD-023's own design contradicted — it claimed CARD-023 would "populate" `repoRoot` and would change
   "only the second expression" in `index.ts`, when in fact CARD-023's `ResolvedPaths` is
   `{boardDirPath, projectName}` and it deletes both expressions. Had that passed, the false claim would
   have become standing doctrine. The rework makes this card self-sufficient: `repoRoot` comes from
   `resolve(args.targetRepo)`, already in scope at the call site, so **merge order with CARD-023 (PR #61)
   is free in both directions** — the re-check traced that claim line-by-line rather than accepting it.
2. **One documented deviation.** If *this* card merges before CARD-023, CARD-023's approved design text
   writes `createServer({boardDir, projectName})` with no `repoRoot`, so its implementer adds one
   argument and deviates from their own doc. `tsc -b --noEmit` catches it loudly. ADR-0013 names this so
   it is an expectation, not a surprise.
3. **Size is the real risk.** Bottom-up lands at **~478** against a 500 cap, and the design check
   independently derived ~468 — both inside slice-check's 416/483 band, but the margin is thin on a
   project that has twice run ~2x its design-time figure. The split boundary is therefore **named and
   pre-authorised now** at the task 5/6 line: tasks 1-5 are `phase-docs.ts` + the matchers + unit tests
   (~282, a self-contained module with no consumer, the CARD-021 lead-slice shape), tasks 6-9 are the
   endpoint wiring (~196). Better to name it in advance than invent one under pressure at review.
4. **One proof gap worth actioning at implement time** (design-check A2): `index.ts` is
   coverage-excluded, and it is the only site that *chooses* the `repoRoot` value. The required field is
   compiler-enforced for presence but never for correctness, so a wrong expression there produces exactly
   the silent zero-docs failure the ADR exists to prevent. The implementer should add the manual smoke
   CARD-023's design already carries — run the built server against this repo and `curl` the docs route,
   expecting a `source:"worktree"` entry.
5. **A known product decision, flagged not fixed:** split-slice docs `deliver-1.md`/`deliver-2.md` (real
   files here) are **not** served, while their `deliver-check-1.md`/`deliver-check-2.md` **are**, because
   of the exact-vs-prefix matching rule. CARD-016 will therefore show a check-doc tab whose subject doc is
   missing. Widening that is a spec question (REQ-005), not this card's.

The design check verdicted **pass** on all eight `DSG-*` criteria. Six advisories ride this PR — see
`docs/cards/CARD-008-serve-phase-docs/design-check.md`. One of them (the CARD-023 merge-order deviation)
was applied to ADR-0013's text at persistence time, since an ADR lands permanently on `main`.

Full design: `docs/cards/CARD-008-serve-phase-docs/design.md` (in this diff). Merging this PR approves
the design and unblocks implementation — the implementation branch is cut from main after this merges,
and the code arrives as a second PR.

🤖 Design delivered via /kanban
