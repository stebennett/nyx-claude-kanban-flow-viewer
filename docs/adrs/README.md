# Architecture Decision Records

| ADR | Title | Status | Card | Date |
|---|---|---|---|---|
| [ADR-0001](0001-esm-only-package-targeting-node-20.md) | ESM-only package targeting Node 20+ | Accepted | CARD-001 | 2026-07-17 |
| [ADR-0002](0002-build-and-publish-layout-two-builders-one-dist-no-runtime-dependencies.md) | Build and publish layout: two builders, one dist, no runtime dependencies | Accepted | CARD-001 | 2026-07-17 |
| [ADR-0003](0003-typecheck-runs-tsc-b-noemit-across-per-half-projects-not-tsc-noemit.md) | Typecheck runs `tsc -b --noEmit` across per-half projects, not `tsc --noEmit` | Accepted | CARD-001 | 2026-07-17 |
| [ADR-0004](0004-ci-gates-single-reusable-workflow-no-build-state-caching.md) | CI gates run as a single reusable workflow, with no build-state caching | Superseded by ADR-0006 | CARD-002 | 2026-07-18 |
| [ADR-0005](0005-card-model-shape-and-explicit-frontmatter-mapping.md) | Card model shape and the explicit snake_case→camelCase frontmatter mapping | Accepted | CARD-019 | 2026-07-18 |
| [ADR-0006](0006-ci-gate-order-build-before-test.md) | CI gate order runs build before test (build gate feeds the test gate) | Accepted | CARD-002 | 2026-07-18 |
