## CARD-001 — design: Scaffold the TypeScript package and toolchain   [task · infra]

### Why

Nothing in this project can be linted, typechecked, tested, built or released until the package
exists. This card establishes the toolchain floor — package.json, TypeScript configs, ESLint,
Vitest and Vite, plus minimal server and UI entry points — so that every gate REQ-036 requires has
something real to run against. It owns the *gates*, not the product: CARD-002 wires these same
scripts into CI, CARD-003 publishes the artifact they produce, and CARD-004+ implement the
parser/server/UI against the layout fixed here.

### Design summary

- **Two builders, one `dist`, no runtime dependencies.** `tsc -b tsconfig.server.json` emits
  `src/server` → `dist/server`; Vite emits `src/ui` → `dist/ui`. Published as `files: ["dist"]`
  with `bin` at `dist/server/index.js`, so `npx` does zero build work (REQ-007).
- **Per-half TypeScript projects.** The server needs `module: NodeNext` + Node libs; the UI needs
  `moduleResolution: bundler` + DOM libs + JSX. One flat config would force the union and let
  `document` typecheck inside server code — the split enforces the REQ-006 boundary by construction.
- **A gate that cannot fail is not a gate.** Every acceptance criterion is verified by *mutation*
  during implementation (inject an error, watch the gate go red), not by observing a green run.
- **One real pure function** (`uiDistDir`) is the seam where the build-layout decision becomes
  code; `test/packaging.test.ts` pins `bin`, tsc's outDir, Vite's outDir and that function to each
  other so they cannot drift apart silently.
- **React is a devDependency**, not a dependency — Vite bundles it into `dist/ui` at build time, so
  the published package carries no runtime copy and `dependencies` stays empty.

### Acceptance criteria (sharpened)

- **AC-1** — On a clean checkout, `npm ci` exits 0 against the committed lockfile, then
  `npm run lint` exits 0. ESLint reports at least one error when a violation exists in **either**
  `src/server` or `src/ui`. (REQ-036)
- **AC-2** — `npm run typecheck` exits 0 **and actually checks**: a type error introduced in any of
  `src/server/paths.ts`, `src/ui/App.tsx` or `vite.config.ts` makes it exit non-zero. (REQ-036)
- **AC-3** — `npm test` runs Vitest and exits 0 with ≥1 real test; `npm run test:coverage` reports
  ≥90% on the core logic layer. (REQ-036, Testing)
- **AC-4** — `npm run build` exits 0 and produces `dist/ui/index.html` plus a hashed JS asset, and
  `dist/server/index.js` with an executable shebang. (REQ-006, REQ-007)
- **AC-5** — package.json declares `bin: { "kanban-flow-viewer": "dist/server/index.js" }` and
  `files: ["dist"]`; `npm pack --dry-run` lists both in the tarball. (REQ-006, REQ-007)

### ADRs in this PR

- **ADR-0001** — ESM-only package targeting Node 20+
- **ADR-0002** — Build and publish layout: two builders, one dist, no runtime dependencies
- **ADR-0003** — Typecheck runs `tsc -b --noEmit` across per-half projects, not `tsc --noEmit`

### Open questions / decisions deferred

The designer raised no open questions. Two items need your attention:

**AC-2 deviates from the card's literal wording — deliberately.** The card specifies the typecheck
gate as `tsc --noEmit`. Under the multi-tsconfig layout REQ-006's server/UI split forces, the root
config is a solution file (`files: []` + `references`), so `tsc --noEmit` resolves **zero input
files and exits zero** — a gate that passes on a codebase full of type errors. CARD-002 wires this
exact script into CI, so taking AC-2 literally would silently disable REQ-036's type gate for the
life of the project. The gate is therefore `tsc -b --noEmit`, recorded in ADR-0003 and proven by
three type-error mutations rather than asserted. The design check verified the mechanism
independently (TS18003 is suppressed when a config declares `files`/`references`, and non-build
`tsc` does not traverse `references`) and judged the deviation justified, minimal and properly
recorded.

**Follow-up for the driver:** `docs/spec.md` REQ-036 still names `tsc --noEmit`. CARD-002 designs
CI from REQ-036, so the spec text should be amended via `/requirement` to stop contradicting the
gate ADR-0003 establishes. Left as-is here — amending the spec is outside this card's authority.

The design check passed with **no blocking findings** and four advisories, carried in
`design-check.md` in this diff: task 2's mutation step is sequenced before the files it mutates
exist (task-list ordering, fix at implementation); the spec/REQ-036 wording residue above;
`JSX.Element` in an interface sketch should be `React.JSX.Element` under @types/react 19; and
design.md exceeds the ≤150-line advisory budget.

Full design: `docs/cards/CARD-001-scaffold-package-toolchain/design.md` (in this diff). Merging this
PR approves the design and unblocks implementation — the implementation branch is cut from main
after this merges, and the code arrives as a second PR.

🤖 Design delivered via /kanban
