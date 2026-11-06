# Architecture Decision Records

| ADR | Title | Status | Card | Date |
|---|---|---|---|---|
| [ADR-0001](0001-esm-only-package-targeting-node-20.md) | ESM-only package targeting Node 20+ | Accepted | CARD-001 | 2026-07-17 |
| [ADR-0002](0002-build-and-publish-layout-two-builders-one-dist-no-runtime-dependencies.md) | Build and publish layout: two builders, one dist, no runtime dependencies | Accepted | CARD-001 | 2026-07-17 |
| [ADR-0003](0003-typecheck-runs-tsc-b-noemit-across-per-half-projects-not-tsc-noemit.md) | Typecheck runs `tsc -b --noEmit` across per-half projects, not `tsc --noEmit` | Accepted | CARD-001 | 2026-07-17 |
| [ADR-0004](0004-ci-gates-single-reusable-workflow-no-build-state-caching.md) | CI gates run as a single reusable workflow, with no build-state caching | Superseded by ADR-0006 | CARD-002 | 2026-07-18 |
| [ADR-0005](0005-card-model-shape-and-explicit-frontmatter-mapping.md) | Card model shape and the explicit snake_case→camelCase frontmatter mapping | Accepted | CARD-019 | 2026-07-18 |
| [ADR-0006](0006-ci-gate-order-build-before-test.md) | CI gate order runs build before test (build gate feeds the test gate) | Accepted | CARD-002 | 2026-07-18 |
| [ADR-0007](0007-release-workflow-reuse-gates-sha-pinned-provenance-publish.md) | Release on a vX.Y.Z tag: reuse CI gates, SHA-pinned actions, provenance publish | Superseded by ADR-0009 | CARD-003 | 2026-07-18 |
| [ADR-0008](0008-board-walk-total-function-degrades-to-parseerrors.md) | The board walk is a total function: buildSnapshot degrades all file and parse failures into the snapshot, never throws | Accepted | CARD-021 | 2026-07-18 |
| [ADR-0009](0009-publish-via-npm-trusted-publishers-oidc-instead-of-npm-token.md) | Publish via npm Trusted Publishers (OIDC) instead of an NPM_TOKEN secret | Accepted | CARD-003 | 2026-07-20 |
| [ADR-0010](0010-first-http-server-node-http-factory-json-api-contract.md) | First HTTP server: node:http with a createServer factory and a JSON /api/* contract | Accepted | CARD-006 | 2026-07-20 |
| [ADR-0011](0011-req-001-enforced-suite-wide-by-a-shared-server-guard.md) | REQ-001 enforced suite-wide by a shared server-guard, not per card | Accepted | CARD-006 | 2026-07-20 |
| [ADR-0012](0012-cli-flags-hand-rolled-pure-args-module.md) | CLI flags parsed by a hand-rolled pure args module returning a discriminated result | Accepted | CARD-023 | 2026-07-21 |
| [ADR-0013](0013-server-path-context-explicit-reporoot.md) | Server path context: an explicit repoRoot alongside boardDir, with worktree card dirs derived by relative board path | Accepted | CARD-008 | 2026-07-21 |
| [ADR-0014](0014-sse-transport-contract-snapshot-hub.md) | SSE transport contract: full-snapshot data: frames broadcast by a per-server hub of frame sinks | Accepted | CARD-027 | 2026-07-21 |
