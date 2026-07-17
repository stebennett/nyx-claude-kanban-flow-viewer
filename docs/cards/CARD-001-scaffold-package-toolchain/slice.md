## Verdict
Right-sized. No split.

## Rationale
The slice test asks: can this split into 2+ slices each independently shippable,
testable, and delivering a piece of functionality? Applied to CARD-001's five
acceptance criteria (lint, typecheck, test, build, bin+files):

- These are not separable end-user-observable increments — they are facets of a
  single fact: "the toolchain works end to end." A card that only made `npm run lint`
  pass, for instance, would have nothing meaningful to lint (no server/UI source) and
  delivers no functionality on its own — exactly the "scaffolding child with no
  observable behaviour" the heuristics forbid.
- The obvious cut ("package.json + server entry" vs "UI + Vite build") is a
  **horizontal split by layer** (never-split heuristic), and — as the card's own Notes
  already record — leaves both halves unable to satisfy `npm run build` alone, so
  neither is independently shippable. I re-verified this reasoning against the real
  (still-empty) tree rather than taking it on trust; it holds.
- The five criteria share one invariant that must land atomically: a `package.json`
  whose `bin`/`files` are correct only once both the server entry and the built UI
  bundle exist, and whose lint/typecheck/test scripts only prove anything once both
  entry points exist to be linted/typechecked/tested. Splitting would force redesigning
  the first half's `package.json` once the second half landed — the "don't split"
  condition.
- Calibration: 5 acceptance criteria sits at the soft ceiling, but they don't span two
  unrelated spec sections (all REQ-006/REQ-007/REQ-036, one concern: "the toolchain
  exists"), and CI wiring (REQ-036's *workflow*) is correctly deferred to CARD-002 —
  confirmed by reading CARD-002/card.md, which starts from `right_sized: true` and
  depends_on: [CARD-001], i.e. intake already carved the workflow-file concern out.
- CARD-004's parser work (gray-matter, chokidar) is confirmed out of scope here by
  reading CARD-004/card.md — this card only needs the toolchain's own devDependencies,
  which keeps the estimate well under the ceiling and validates the Notes' claim that
  the margin doesn't depend on scope creep.

## Size estimate
Bottom-up file walk against the real (currently empty) repo tree. `.gitignore` already
covers `node_modules/`, `dist/`, `coverage/`, `*.tsbuildinfo` (verified — no diff
needed there). `package-lock.json` is excluded per `size_exclude`.

| File | Purpose | Est. lines |
|---|---|---|
| `package.json` | scripts (lint/typecheck/test/build), devDeps (typescript, eslint + typescript-eslint, vite, @vitejs/plugin-react, vitest, react, react-dom), `bin`, `files`, `type: module` | 55 |
| `tsconfig.json` | root, project references to app/node/server configs | 12 |
| `tsconfig.app.json` | UI compiler options (jsx, dom lib, bundler resolution) | 25 |
| `tsconfig.node.json` | config for `vite.config.ts` itself | 15 |
| `tsconfig.server.json` | server compiler options (node lib, no dom) | 20 |
| `eslint.config.js` | flat config: typescript-eslint + react-hooks/react-refresh for `src/ui`, plain TS rules for `src/server`, ignores `dist` | 55 |
| `vite.config.ts` | `@vitejs/plugin-react`, build outDir inside the package, `test:` block for Vitest | 30 |
| `src/server/index.ts` | minimal CLI entry (shebang + one small exported function for the test to exercise) | 30 |
| `src/server/index.test.ts` | the "at least one real test" Vitest requires | 25 |
| `src/ui/main.tsx` | React root render | 12 |
| `src/ui/App.tsx` | minimal placeholder component | 18 |
| `src/ui/App.css` | minimal styling | 10 |
| `src/ui/index.css` | minimal global styling | 8 |
| `src/ui/vite-env.d.ts` | standard Vite client types triple-slash ref | 3 |
| `index.html` | Vite entry HTML | 15 |
| **Total** | | **333** |

Rounded to **360** for wiring/config uncertainty (first-time toolchain integration
across a hybrid Node-CLI + React-SPA package tends to need a few extra lines of glue
not visible until the tools are actually run). Still well under `size_limit` 500 —
consistent with, and a tighter confirmation of, the intake estimate (406, range
350-480).
