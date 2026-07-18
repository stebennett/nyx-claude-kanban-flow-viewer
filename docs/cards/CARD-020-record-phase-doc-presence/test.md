---
verdict: pass
---
# CARD-020 — Test

## Verdict
**pass** — all four gates green on an independent clean run; coverage 100% on the core-logic layer
(target 90%), and the new branch coverage is non-vacuous (each branch has its own asserted fixture).

## Gates
| gate | command | result |
|---|---|---|
| lint | `npm run lint` | ESLint: No issues found (0) |
| typecheck | `npx tsc -b --noEmit` | No errors (0) — correct `-b` solution-root form (KNOWLEDGE CARD-001) |
| build | `npm run build` | UI (vite) + server (`tsc -b --force`) both exit 0 |
| tests+coverage | `npx vitest run --coverage` | **48/48 passing**, **100%** stmts/branch/funcs/lines on `card-model.ts` + `parse-card.ts` (≥ 90% target) |

## Coverage — non-vacuous branch verification
100% v8 coverage alone does not prove each branch is *asserted* (KNOWLEDGE CARD-019). Independently
confirmed each `hasCheckDoc` branch has its own asserted fixture that a mutation would fail:
- **exact match** (`deliver-check.md`) → `deliver.check` true (parse-card.test.ts:470–472)
- **prefix match** (`deliver-check-design.md`, `deliver-check-2.md`) → `deliver.check` true (474–480)
- **`.md` guard false** (`deliver-check-note.txt`) → `deliver.check` false (489–491)
- **no-match noise** (`card.md`, `README.md`, …) → all phases false (493–497)
- **`entries ?? []` undefined-vs-empty** distinction proven separately (451–457).

## AC-2 purity (no fs)
`parseCard(FIXTURE, { dirName: '/does/not/exist', entries: ['deliver.md'] }).phaseDocsPresent.deliver.phase === true`
(parse-card.test.ts:546–553) — presence is derived from `entries`, never from a readdir of `dirName`;
a filesystem access would crash on the nonexistent path.

## Determinism
The fast-check membership property uses a fixed seed (`20260718`) with `numRuns: 200`
(parse-card.test.ts:500–525) — reproducible, no flaky gate.

## Result
No blocking findings. Advancing to the review lens panel.
