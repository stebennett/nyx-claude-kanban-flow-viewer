---
id: ADR-0008
title: "The board walk is a total function: buildSnapshot degrades all file and parse failures into the snapshot, never throws"
status: Accepted
date: 2026-07-18
card: CARD-021
supersedes: []
superseded_by: ""
---

# ADR-0008: The board walk is a total function: buildSnapshot degrades all file and parse failures into the snapshot, never throws

## Context

`parseCard` (ADR-0005) is pure but NOT total — `matter()` throws a `YAMLException` on malformed
frontmatter (KNOWLEDGE [CARD-019]). `card.md` and `config.md` are untrusted (REQ-002); REQ-033
mandates a malformed `card.md` never crash the board. `buildSnapshot` is the single board read
consumed by `GET /api/board` (CARD-006) and the SSE watcher (CARD-007), which re-parses on every
debounced change (REQ-008) — if it throws, one bad file kills the live board and every reconnect.

## Decision

For any contents of an EXISTING board directory, `buildSnapshot` never throws. Every per-card parse
failure (and read failure) and a malformed `config.md` route to `snapshot.parseErrors`
(`{path, error}`, with a board-relative forward-slash path); a card dir missing `card.md` is skipped;
a valid card always parses regardless of sibling failures; an absent `config.md` degrades silently to
the default config (REQ-014 permits a board of only cards). A missing board directory is the one
uncaught case — a precondition owned by REQ-014's startup validation, not this function.

## Status

Accepted

## Consequences

CARD-006/007 call `buildSnapshot` without wrapping it in try/catch; the live board is immune to a
single bad file including `config.md`. `parseErrors` becomes the single tray for every degradation, so
its `{path, error}` shape (board-relative path, string message) is now a cross-cutting contract. To
honour "never throws" literally, the per-card `try` must span both `readFileSync(card.md)` and
`parseCard` (so a listed-but-unreadable card — permission error or a readdir/read delete race — also
routes to `parseErrors`, not just malformed content). Cost: a wholesale-broken board renders
sparse/empty rather than erroring loudly — mitigated by REQ-014's startup check. Complements ADR-0005
(parser pure but explicitly not total); supersedes nothing.
