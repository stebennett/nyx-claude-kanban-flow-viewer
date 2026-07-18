---
id: ADR-0005
title: "Card model shape and the explicit snake_case→camelCase frontmatter mapping"
status: Accepted
date: 2026-07-18
card: CARD-019
supersedes: []
superseded_by: ""
---

# ADR-0005: Card model shape and the explicit snake_case→camelCase frontmatter mapping

## Context

`card.md` frontmatter is the single source of truth (REQ-002/020/021). The parsed `CardModel` is
serialized verbatim into `/api/board` (REQ-016/019) and consumed by the whole UI and by every
downstream card (CARD-005 snapshot, CARD-011 blocked flag, CARD-018 docs, CARD-020 phase-doc scan) —
an expensive-to-reverse cross-cutting contract. Frontmatter keys are snake_case; this parser is the
single mapping point to camelCase (KNOWLEDGE CARD-004). The model must tolerate unknown/renamed status
values (REQ-027 overflow, REQ-033 never crash) and be forward-extensible (CARD-020 adds
`phaseDocsPresent`).

## Decision

Define `CardModel` (+ `ReworkCounts`, `CriteriaCount`) in `card-model.ts` with the REQ-020 fields plus
body-derived `why`/`notes` and detail-panel `branch`/`worktree`/`adrs` (REQ-032/018), all camelCase;
`status`/`phase`/`type`/`layer` are plain `string` (no unions) so unrecognized values pass through.
Map frontmatter with an **explicit** field-by-field mapping and per-field coercion/defaults (missing
optionals never throw), never a generic key transform: string `''`; string[] `[]`; `number|null` line
counts; `splitSlices` `0`; a fully-defaulted `reworks`; date-ish fields coerced to `'YYYY-MM-DD'`
strings; `blocker` optional (set only when non-empty). The entry point
`parseCard(raw: string, options: ParseCardOptions): CardModel` takes an options object so CARD-020 adds
`entries` additively without changing arity or the no-I/O contract. `parseCard` performs no filesystem
or network access — `BOARD.md` is unreachable by construction.

This card adds `gray-matter` to `dependencies` — the project's first runtime dependency.

## Status

Accepted

## Consequences

Single greppable mapping point; downstream cards extend additively rather than redesigning. Explicit
mapping stops unmodeled/mistyped keys leaking into the public JSON API and gives per-field control
(dates, nested reworks, null line counts). String-typed status keeps the parser robust to vocabulary
drift. Purity makes the domain layer testable from string fixtures with no temp files or mocks. Cost:
the map is hand-maintained against the frontmatter schema.

**Amends ADR-0002.** ADR-0002 recorded, as a consequence, that `dependencies` stays empty and `npx`
installs zero runtime dependencies (React being a devDependency Vite bundles at build time). That
consequence is now narrowed: `gray-matter` is a genuine server-side runtime dependency that `tsc` does
not bundle, so the published package carries exactly one runtime dependency from this card onward. This
is a consequence-scope amendment, not a reversal of ADR-0002's build/publish layout — the two-builders,
one-`dist`, `files: ["dist"]` decision stands unchanged.
