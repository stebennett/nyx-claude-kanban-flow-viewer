---
verdict: pass
criteria: {DSG-AC-COVERED: pass, DSG-SPEC-FIDELITY: pass, DSG-TASK-TDD: pass, DSG-DOCTRINE: pass, DSG-ADR-NEEDED: pass, DSG-KNOWLEDGE: pass, DSG-SCOPE: pass, DSG-NO-CODE: pass}
---
## Verdict

**pass** — no blocking findings. Four advisories ride the design PR.

The design is unusually strong on the axis checkers most often miss: it treats every gate as
falsifiable (a mutation per acceptance criterion, design.md:225-232) rather than asserting green.
Its one deviation from the card's literal AC wording is justified, narrowly scoped, and properly
recorded — see the AC-2 analysis below, which I derived independently rather than accepting.

## Criteria

| id | verdict | evidence |
|---|---|---|
| DSG-AC-COVERED | pass | card.md:39-43 — all 5 ACs map to tasks: AC-1→t1+t7, AC-2→t2, AC-3→t3, AC-4→t4+t6, AC-5→t4+t8; my independently derived 8-task list (manifest, tsconfigs, eslint, vitest+test, vite+UI, server entry, packaging test, pack verify) matches design.md:131-190 one-to-one with no gaps |
| DSG-SPEC-FIDELITY | pass | Opened all 7 cited sections: REQ-006 (spec.md:56-63), REQ-007 (65-69), REQ-010 (87-92), REQ-015 (118-121), REQ-036 (275-280), REQ-037 (282-289), Testing (291-300) — each says what design.md:246-259 claims; REQ-016/017 at design.md:105 also verified; the AC-2 deviation serves REQ-036's operative clause rather than contradicting it (analysis below) |
| DSG-TASK-TDD | pass | design.md:152-167 — t3 writes paths.test.ts first (RED: "Cannot find module './paths.js'") then implements; t4 writes packaging.test.ts first (RED: no bin/files); t1-2 bootstrap the runner with an acknowledged command-failure red (design.md:129-130); all tasks file-level; t5/t6/t7 carry smoke/mutation proofs in lieu of units, consistent with the stated coverage boundary |
| DSG-DOCTRINE | pass | Rule by rule below — 2 apply (spec-outranks-training, determinism), both honoured; 3 are `na` with reasons (no money/decimal, no paired derived quantities, no per-record snapshots in a toolchain card) |
| DSG-ADR-NEEDED | pass | docs/adrs/README.md is a bare title — zero standing ADRs, so no duplication or silent contradiction possible; 3 proposals at design.md:261-323 each carry Context/Decision/Consequences and are genuinely expensive-to-reverse; recorded on disk per AGENT-PROTOCOL.md:122-125; no unrecorded significant decision found (Vitest is spec-given per Testing, not a choice) |
| DSG-KNOWLEDGE | pass | All 6 KNOWLEDGE.md CARD-001 entries honoured, several verbatim: tsc -b (t2+ADR-0003), React devDeps (t1+ADR-0002+packaging assert), coverage boundary (design.md:193-196), no runtime deps (design.md:34,216-217,242), vite plain object + comment-free tsconfig (design.md:144,154), npm pack verification (t8) |
| DSG-SCOPE | pass | design.md:24-42 — In/Out of scope explicit with per-item reasons and card handoffs; every task traces to an AC; paths.ts/uiDistDir defensible as the minimal real logic AC-3's "≥1 real test" demands and the seam AC-4/AC-5 pin; REQ-037 cited but explicitly deferred to CARD-003; est. ≈392 under size_limit 500 |
| DSG-NO-CODE | pass | `Glob **/*.{ts,tsx,js,jsx,json,html,css}` over the design worktree returns zero files — branch is docs-only; design.md:85-103's snippets are signature declarations and comments (`export function uiDistDir(serverModuleUrl: string): string;` — no body), and every file is phrased as a task ("Create…", "Write… first") |

## Acceptance criteria → tasks

Derived my own expected task list from card.md:39-43 **before** opening design.md's. Both directions:

**Criteria → tasks (a criterion with no task = DSG-AC-COVERED):**

| Card AC | Design task(s) | Covered |
|---|---|---|
| AC-1 `npm ci && npm run lint` exits zero | t1 (manifest + `npm ci` verify), t7 (eslint.config.js, `lint` script, two-half lint mutation) | yes |
| AC-2 `npm run typecheck` exits zero | t2 (tsconfigs, `typecheck` script, three-file gate mutation) | yes — wording deviation analysed below |
| AC-3 `npm test` runs Vitest, ≥1 real test | t3 (paths.test.ts RED→GREEN, vite.config.ts test block, `test`/`test:coverage` scripts) | yes |
| AC-4 `npm run build` produces the UI bundle | t4 (build scripts), t6 (UI entries + build verification) | yes |
| AC-5 package.json declares bin + files | t4 (bin/files RED→GREEN), t8 (`npm pack --dry-run`) | yes |

**Tasks → criteria (a task serving no criterion = DSG-SCOPE):**

| Task | Serves | Justified |
|---|---|---|
| t1 manifest | AC-1, AC-5 | yes |
| t2 tsconfigs | AC-2 | yes |
| t3 paths.test.ts + paths.ts + vite config | AC-3 | yes — AC-3 demands a *real* test, which needs real logic |
| t4 packaging.test.ts + bin/files/build scripts | AC-4, AC-5 | yes |
| t5 server entry | AC-4 (dist/server/index.js + shebang); target for AC-1/AC-2 mutations | yes |
| t6 UI entries + build | AC-4 | yes |
| t7 eslint flat config | AC-1 | yes |
| t8 pack verify + end-to-end | AC-5, all | yes |

No orphans in either direction. My independent list anticipated every task the design proposes;
the design adds `tsconfig.base.json` and `test/packaging.test.ts` beyond slice.md's file walk, both
accounted for in its revised ≈392 estimate (design.md:239-242).

## Doctrine

Worked rule by rule from AGENT-PROTOCOL.md:50-68.

- **The spec outranks your training** — *applies; honoured.* `## Spec references` (design.md:244-259)
  cites a section for every rule implemented; I opened all seven and each says what the design claims.
  The one place the design departs from a *card* AC it does so loudly rather than silently: the
  departure is stated at the top of the criteria table (design.md:13-14), reasoned in Approach
  (58-61), recorded as ADR-0003 (301-323), and made falsifiable by mutation (229). This rule is under
  the most pressure in this design and it is handled by surfacing the conflict, not burying it.
- **Numeric precision** — *`na`.* No money, no decimal arithmetic, no rounding anywhere in scope. The
  card's entire surface is package.json, tsconfigs, eslint/vite config, two entry points and one pure
  path function (design.md:24-30); the only computation is `path.resolve` over strings.
- **Parallel derived values** — *`na`.* The spec defines no pair of related computed quantities in this
  card's scope. Worth noting the design honours the rule's *spirit* anyway at its nearest analogue:
  Vite's `build.outDir` and the runtime `uiDistDir()` are two derivations of one layout fact, and
  design.md:221-223 pins them to each other with an explicit equality assertion so they cannot drift.
- **As-of semantics** — *`na`.* No per-record figures, no stored snapshots, no replay, no dated
  records. Board snapshots (REQ-008) are explicitly out of scope (design.md:35-36).
- **Determinism** — *applies; honoured.* design.md:236-237 — "No network in tests, no fixed clock or
  seed needed (nothing time- or random-dependent). No mocks anywhere." Corroborated: `npm ci` reads a
  committed lockfile (design.md:51,113), expected test values are hand-computed rather than restating
  `path.resolve` (198-199), paths are POSIX with the platform assumption declared (41-42,199), deps are
  version-pinned (133-135). The honesty of the "no fixed clock needed" claim checks out — nothing in
  scope reads a clock or an RNG.

Also observed (Doctrine's closing bullets): **evidence over claims** is instructed explicitly at
design.md:129 ("Paste real command output as evidence (never report an unobserved result)") and again
at 184-187 ("This is not assumable"); **YAGNI** is enforced by an aggressive, reasoned out-of-scope
list (32-42) that defers jsdom/RTL, fast-check and Windows support.

## The AC-2 deviation — independent analysis

The design's load-bearing claim, checked rather than accepted:

1. **Is the false green real?** Yes. TypeScript suppresses TS18003 ("No inputs were found in config
   file") when the config declares `files` and/or `references` — the guard is
   `canJsonReportNoInputFiles = !hasProperty(raw, "files") && !hasProperty(raw, "references")`. And
   non-build `tsc -p` does not traverse `references`. So a root `{ "files": [], "references": [...] }`
   under plain `tsc --noEmit` resolves zero inputs, reports nothing, exits zero. This is exactly why
   the stock Vite template pairs a solution root with `tsc -b`. The design's `tsc -b --noEmit` remedy
   also correctly assumes TS ≥ 5.6 (design.md:47) — `--noEmit` was rejected in build mode before 5.6 —
   and records a `tsc -p … --noEmit` fallback (314-315).
2. **Did the design manufacture the conflict to justify the rewrite?** No. slice.md:43-46 already
   baselined `tsconfig.app.json` / `tsconfig.node.json` / `tsconfig.server.json`. The multi-project
   layout is the inherited, right-sized baseline, not an invention. Its rejected alternative (one flat
   tsconfig, design.md:73-76) is refused on REQ-006 integrity grounds — a union config lets `document`
   typecheck inside server code — which is sound.
3. **Is it out-of-scope AC rewriting?** No. The card's binding text is "`npm run typecheck` … exits
   zero"; `(tsc --noEmit)` is a parenthetical naming an implementation. The design preserves the
   binding observable exactly and sharpens it to "exits 0 **and actually checks**" (design.md:19).
   Deviation is confined to the gate's command.
4. **Which reading serves the spec?** The design's. REQ-036 (spec.md:275-280) requires that "Any gate
   failing fails the workflow" — a gate that *cannot* fail defeats the requirement's operative clause.
   The literal wording would ship precisely the lie the blocking bar exists to catch.
5. **Is it properly recorded?** Yes, on three surfaces: ADR-0003 in `## Proposed ADRs` on disk as
   AGENT-PROTOCOL.md:122-125 requires; the mutation evidence at design.md:229 ("Plain `tsc --noEmit`
   survives all three — that is the evidence for ADR-0003"), which makes the ADR's premise falsifiable
   at implementation rather than asserted; and a standing KNOWLEDGE.md convention.

Conclusion: justified, minimal, and recorded. DSG-SPEC-FIDELITY, DSG-SCOPE and DSG-AC-COVERED all
pass on this point. The one residue is that spec.md:278 still carries the old wording — advisory
below, and outside a design agent's authority to fix.

## Blocking findings

None.

## Advisory findings

1. **DSG-TASK-TDD — `design.md:145-151`.** Task 2's verification injects type errors into
   `src/server/paths.ts`, `src/ui/App.tsx` and `vite.config.ts`, but none exists until tasks 3 and 6.
   Compounding it: leaf configs use `include`, not `files: []`, so TS18003 is *not* suppressed on them —
   `tsc -b --noEmit` at task 2 errors on empty includes rather than exiting zero. *Remedy:* move task
   2's mutation verification after task 6, or stub the three files. The AC mutation table (225-232) and
   task 8 already cover the verification; only task 2's wording needs to move.
2. **DSG-SPEC-FIDELITY — `design.md:322-323`.** spec.md:278 (REQ-036) still names `tsc --noEmit`, so the
   spec text contradicts the shipped gate, and CARD-002 designs CI from REQ-036. Mitigated by
   packaging.test.ts asserting a `typecheck` script (218), ADR-0003 stating CARD-002 wires that script,
   and the KNOWLEDGE convention — hence advisory. *Remedy:* driver amends REQ-036 via `/requirement`;
   optionally ADR-0003 recommends it.
3. **DSG-AC-COVERED — `design.md:102`.** `export default function App(): JSX.Element` — @types/react 19
   removed the global `JSX` namespace (now `React.JSX`), so the sketch would fail the very gate AC-2
   names App.tsx as a mutation target for. *Remedy:* `React.JSX.Element` or drop the annotation.
4. **DSG-SCOPE — `design.md:1-324`.** 324 lines against AGENT-PROTOCOL.md:100's ≤150 advisory budget;
   the mandated ADR section accounts for 63, leaving ~260. No rework warranted — nothing is padding.
