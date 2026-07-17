# Knowledge

Cross-card knowledge captured by `/kanban` from phase agents. Entries are prefixed
`[CARD-NNN]`. Decisions live in ADRs (`adr_dir`), not here.

## Conventions

- [CARD-001] The typecheck gate is `tsc -b --noEmit`, never plain `tsc --noEmit`: the root
  tsconfig.json is a solution file (`files: []` + references), so `tsc --noEmit` at the root
  checks zero files and exits zero — a false green.
- [CARD-001] React/react-dom are devDependencies, not dependencies: Vite bundles them into
  dist/ui at build time (REQ-007), so the published package carries no runtime copy.
  `dependencies` is empty until a card needs a true runtime dep (gray-matter/chokidar, CARD-004+).
- [CARD-001] Coverage measures the core logic layer only — `src/server/**/*.ts` minus entry
  points (`src/server/index.ts`), which are the I/O edge and are proven by the build/smoke step
  instead. Threshold 90% (lines/functions/branches/statements).

## Gotchas

- [CARD-001] The size_limit margin on toolchain/scaffolding cards leans on
  package-lock.json being size_exclude — keep package.json to devDependencies only for
  the tooling being scaffolded (no runtime deps like gray-matter/chokidar) to stay
  comfortably under the cap; those land with the cards that actually use them (CARD-004+).
- [CARD-001] vite.config.ts must export a plain object (not a config function) and
  tsconfig.server.json must stay comment-free — test/packaging.test.ts imports the former and
  JSON.parses the latter to assert the build layout hasn't drifted from package.json's bin/files.
- [CARD-001] `dist/` is gitignored but shipped via package.json `files` — npm's packlist has
  historically applied .gitignore inside `files` entries. Never trust it by inspection: verify
  with `npm pack --dry-run` that dist/server and dist/ui appear in the tarball.

## Glossary
