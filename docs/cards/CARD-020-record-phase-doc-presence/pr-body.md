## CARD-020 — design: Record phase-doc presence in the card model   [task · domain]

### Why
REQ-025 places a blocked card in its *underlying phase's* column, inferred from which phase docs
exist on disk when the `phase` field is not a flow value. This card exposes that scan on the domain
model CARD-019 produces: a purely-additive `phaseDocsPresent` field recording, per phase, whether the
phase doc and its check doc(s) exist — **presence only, never contents**. Sibling of CARD-019 (core
parser), second child of CARD-004.

### Design summary
- One additive field `phaseDocsPresent: PhaseDocsPresent` on `CardModel` and one optional
  `entries?: readonly string[]` input on `ParseCardOptions` — **no signature/arity change**, exactly
  the forward extension ADR-0005 anticipated.
- **`parseCard` stays pure**: the caller (CARD-005) does the single `readdir` and passes the base
  filenames in; `parseCard` derives presence by exact/prefix string matching. No fs in the parser, so
  CARD-019's "never reads BOARD.md by construction" property survives.
- The canonical `PHASE_NAMES` constant + presence types live in the **dependency-free `card-model.ts`**
  (not the gray-matter-bearing `parse-card.ts`), so downstream reuse doesn't leak gray-matter into a
  browser bundle. The derivation function stays in `parse-card.ts`.
- Presence matching uses plain string methods (`Set.has` / `startsWith` / `endsWith`), never a RegExp
  — so CARD-019's unescaped-`extractSection` trap is not engaged. Check-doc matching covers
  `deliver-check.md`, `deliver-check-design.md`, `deliver-check-<k>.md`; `<phase>.md` is an exact match.
- No new module (avoids the TS6307 `tsconfig.test.json` trap); explicit per-key construction (avoids
  the `noUncheckedIndexedAccess` dead-branch coverage trap).

### Acceptance criteria (sharpened)
- The card model records, per phase (slice/design/implement/test/review/deliver), whether `<phase>.md`
  and any `<phase>-check*.md` exist in the card dir — so a blocked card's column can be inferred
  **without reading any doc's contents** (REQ-025).
- The scan takes the directory listing the caller already read; `parseCard` performs **no fs access**
  (REQ-002 / REQ-033 — untrusted input, never crash; the parser stays pure).

### ADRs in this PR
- None. ADR-0005 already governs the card-model shape and explicitly anticipated both the additive
  `phaseDocsPresent` field and the additive `entries` option; this card executes that decision.

### Open questions / decisions deferred
- **Advisory (rides the PR, non-blocking):** `PHASE_NAMES` is placed in `src/server/card-model.ts`.
  CARD-011 (a UI-layer card) reusing it for column inference would cross the load-bearing
  `src/server`↔`src/ui` project boundary — CARD-011 may need a UI-reachable home for the constant or an
  accepted UI re-declaration of flow order. Captured in KNOWLEDGE for that card; no change needed here.

Full design: `docs/cards/CARD-020-record-phase-doc-presence/design.md` (in this diff). Merging this PR
approves the design and unblocks implementation — the implementation branch is cut from main after this
merges, and the code arrives as a second PR.

🤖 Design delivered via /kanban
