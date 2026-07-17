# Knowledge

Cross-card knowledge captured by `/kanban` from phase agents. Entries are prefixed
`[CARD-NNN]`. Decisions live in ADRs (`adr_dir`), not here.

## Conventions

## Gotchas

- [CARD-001] The size_limit margin on toolchain/scaffolding cards leans on
  package-lock.json being size_exclude — keep package.json to devDependencies only for
  the tooling being scaffolded (no runtime deps like gray-matter/chokidar) to stay
  comfortably under the cap; those land with the cards that actually use them (CARD-004+).

## Glossary
