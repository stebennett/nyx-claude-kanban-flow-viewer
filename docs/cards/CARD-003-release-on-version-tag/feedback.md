## 2026-07-20 · deliver (PR #39 review) · change publish auth to npm Trusted Publishers

Driver comment on PR #39 (github.com/.../pull/39#issuecomment-5019848382), verbatim:

> Update this to follow the Trusted Package approach to publishing.
> https://docs.npmjs.com/trusted-publishers

Routing decision (driver): **Rework PR + supersede ADR**. Revise `release.yml` to publish
via npm Trusted Publishers (OIDC) instead of an `NPM_TOKEN` secret, on the existing PR #39;
supersede ADR-0007 with a Trusted-Publishers ADR; update the card's manual-prerequisite note.
Acceptance criteria unchanged (AC-3 "publish with provenance" still holds — trusted
publishing produces provenance automatically). Human-directed change; consumes no rework budget.
