---
id: ADR-0013
title: "Server path context: an explicit repoRoot alongside boardDir, with worktree card dirs derived by relative board path"
status: Accepted
date: 2026-07-21
card: CARD-008
supersedes: []
superseded_by: ""
---

# ADR-0013: Server path context — an explicit repoRoot alongside boardDir

## Context

CARD-008 must reach phase docs on the card's branch via the frontmatter `worktree` path
(REQ-005/REQ-018). `card.worktree` is repo-root-relative; `ServerOptions` (ADR-0010) carries only
`boardDir` (`<repo>/docs/cards` today), so the server has no notion of the repo root and
`path.join(boardDir, card.worktree)` resolves wrong — and fails **silently**, because a missing dir
degrades to zero docs, which reads as "this card has no worktree docs".

Deriving the repo root by walking `../..` up from `boardDir` would hard-code the very assumption
CARD-023 (`--board-dir`, design PR open) is about to break. The repo root is already known at the one
place a server is constructed: `index.ts` has it as `resolve(argv[2])` today, and as
`resolve(args.targetRepo)` from `parseArgs`'s result once CARD-023 lands.

## Decision

`ServerOptions` gains a **required** `repoRoot: string` (absolute). The card's worktree doc dir is
derived as:

```
path.join(path.resolve(repoRoot, card.worktree), path.relative(repoRoot, boardDir), card.dirName)
```

A git worktree is a full checkout, so the board dir sits at the same repo-relative path inside it;
`path.resolve` also lets an absolute `worktree` value pass through untouched. No `..` walk from
`boardDir` anywhere in `src/server`.

The value is supplied **at the `createServer` call site**, from whatever expression yields the resolved
repo root there at merge time; the board path is computed exactly as that call site already computes it
and is **not** rewritten by this change. CARD-023's `ResolvedPaths` (`{boardDirPath, projectName}`) is
not extended — it does not carry the repo root and does not need to, because `args.targetRepo` is
already in lexical scope at that call.

The `:id` from the URL is never used to build a path: it is matched against `snapshot().cards[].id` and
the path comes from the parsed `card.dirName`, so no request input reaches the filesystem.

## Consequences

Every `ServerOptions` construction site must state `repoRoot` — six literals in `http-server.test.ts`
today, more once CARD-023/CARD-027 land, plus `index.ts` — a one-time, compiler-guided cost that makes
the illegal state (a server that thinks it can find a worktree from the board dir alone)
unrepresentable.

This is deliberately unlike CARD-027's optional `hub?` on the same interface: omitting `hub` has a
correct default, whereas every candidate default for `repoRoot` is a guess that yields zero docs without
an error.

Merge order with CARD-023 is free in both directions — neither card reads the other's module, and
whichever lands second only adds or keeps one argument at the shared call site, with the board path
staying as CARD-023 computes it (no reintroduced hardcoded `docs/cards`). **One deviation is worth
naming in advance:** if CARD-008 merges *first*, CARD-023's approved design text literally writes
`createServer({boardDir: boardDirPath, projectName})` with no `repoRoot`, so its implementer must add
that one argument and deviate from their own design doc. The typecheck gate (`tsc -b --noEmit`) catches
it loudly at the shared call site — it is a documented expectation, not a surprise.

CARD-007's successors, CARD-009 and CARD-018's children inherit the field. Path traversal via `:id`
becomes structurally impossible rather than filtered.

Harder: the derivation is defined only for a board dir **inside** the repo root. A board dir that
resolves elsewhere — an absolute `--board-dir`, which CARD-023 explicitly accepts and pins with a test —
makes `path.relative(repoRoot, boardDir)` `..`-prefixed and the derived worktree dir meaningless; it will
not exist, so the read degrades to primary-only docs with no error and no wrong doc. Accepted on those
terms: the failure mode is fewer docs, never wrong docs, never a throw, and the operator who points the
board outside its own repo has no worktree layout for us to infer.

Because `index.ts` is coverage-excluded ([CARD-001]), the required field is compiler-enforced for
*presence* but never for *correctness* — a wrong expression there produces exactly the silent zero-docs
failure this ADR exists to prevent. The evidence for the value is therefore a manual smoke
(`node dist/server/index.js <repo>` + `curl` the docs route, expecting a `source:"worktree"` entry), not
a unit test.

Reversal means touching the shared server contract in every server card, hence the ADR. Extends
ADR-0010; supersedes nothing.

## Status

Accepted.
