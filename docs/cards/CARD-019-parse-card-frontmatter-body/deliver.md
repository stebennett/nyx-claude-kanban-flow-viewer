# CARD-019 — Deliver: implementation PR

## PR
https://github.com/stebennett/nyx-claude-kanban-flow-viewer/pull/9 (one oversized PR — split refused/validated)

## Pushed
- branch: `task/019-parse-card-frontmatter-body`
- commit: e2e470f50d7e3465da9091d91f8590be547ee4a8
- base: `main` (rebased clean on `origin/main`)

## Pre-open confirmation
All gates green in the worktree before the PR opened: `npm ci`, lint, typecheck, build, `npm test`
(34/34) — build before test per ADR-0006. The PR carries the parser (`card-model.ts`, `parse-card.ts`,
`parse-card.test.ts`), the `gray-matter` dependency add, the `tsconfig.test.json` registration, the
ADR-0005-sanctioned `packaging.test.ts` assertion, and the phase docs (implement/test/review/split/
split-check). ADR-0005 landed via the design PR (#7).

Scope note: this card is the **core parse only** — it does NOT do phase-doc discovery (that is the
sibling CARD-020) and `parseCard` is pure (no fs). `parseErrors`/never-crash (REQ-033) is CARD-005's.

## Auth
Pushed as nyxhub-bot over HTTPS via the App installation token. This card does not touch
`.github/workflows/`, so the Workflows-scope block on CARD-002 does not apply.
