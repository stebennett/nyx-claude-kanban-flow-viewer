## CARD-020 — Record phase-doc presence in the card model   [task · domain]

Implementation PR. Split child of CARD-004 (the phase-doc presence scan; the core parse is the
sibling CARD-019, already delivered). The design PR (#20) merged; this carries the code plus its
phase docs. **185 changed lines** (excl. docs/lockfile) — under the 500 size_limit, no split.

### Why
REQ-025 places a blocked card in its *underlying phase's* column, inferred from which phase docs exist
on disk when `phase` is not a flow value. This exposes that scan on the domain model CARD-019 produces:
a purely-additive `phaseDocsPresent` field recording, per phase, whether the phase doc and its check
doc(s) exist — **presence only, never contents**.

### What changed
- **`src/server/card-model.ts`** — adds `PHASE_NAMES` (flow order), the `PhaseName` / `PhaseDocPresence`
  / `PhaseDocsPresent` types, and one field `phaseDocsPresent: PhaseDocsPresent` on `CardModel`. Kept in
  the dependency-free model module so CARD-011's UI can reuse the constant without pulling gray-matter
  into the browser bundle.
- **`src/server/parse-card.ts`** — adds `entries?: readonly string[]` to `ParseCardOptions`, a pure
  exported `derivePhaseDocsPresent(entries)` + private `hasCheckDoc(phase, names)`, wired into
  `parseCard`'s return literal. **`parseCard` stays pure** — presence is derived only from the `entries`
  the caller passes; no fs access, so CARD-019's "never reads BOARD.md by construction" property survives.
- **`src/server/parse-card.test.ts`** — 13 new tests (9 unit fixtures per `hasCheckDoc` branch + a
  fast-check membership property, seed 20260718/numRuns 200 + 3 `parseCard` integration incl. the AC-2
  purity case).

Additive by design: no signature/arity change to `parseCard` (exactly the extension ADR-0005 named), no
new module (avoids the TS6307 registration trap), explicit per-key construction (no indexed access), and
plain-string filename matching (no `extractSection`/RegExp — the CARD-019 unescaped-heading trap is not
engaged).

### Acceptance criteria
- [x] The card model records, per phase, whether `<phase>.md` and any `<phase>-check*.md` exist — presence
  only, contents never read (REQ-025)
- [x] The scan rides the caller's directory read; `parseCard` performs no fs access (REQ-002/033)

### Testing
All gates green on a clean run: lint 0, `tsc -b --noEmit` 0, build 0, **vitest 48/48 with 100% coverage**
on `card-model.ts` + `parse-card.ts` (≥ 90% target). The tester independently confirmed the branch
coverage is **non-vacuous** — each `hasCheckDoc` branch has its own asserted fixture that fails under a
targeted mutation — and AC-2 purity holds (nonexistent `dirName`, presence still derived).

### Review
Full 8-lens panel (`review_lenses_failed: []`): acceptance, design, functionality, security, simplicity,
tests, readability, typescript — **all pass, zero blocking findings**. Multiple lenses independently
mutation-tested or re-ran the gates. Advisories ride the PR (none rework-worthy): a behaviorally-inert
`?? []` fallback claim; the property test duplicates the impl formula (still catches mutations); a
`phase`/`check` field-name overload noted for CARD-011; a trivial repeated `Set`-spread micro-nit.

### Knowledge
`KNOWLEDGE.md` gained: PHASE_NAMES/types belong in the dependency-free `card-model.ts` (server/UI
boundary); plain-string filename matching (check-doc variant coverage); the inert `?? []` fallback; the
`phase`/`check` name overload forewarning for CARD-011; and tag-based ground truth for multi-branch
property tests. No new ADR — ADR-0005 already governs the model extension.

🤖 Card delivered via /kanban
