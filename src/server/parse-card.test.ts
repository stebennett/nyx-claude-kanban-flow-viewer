import { describe, expect, it } from 'vitest';
import { parseCard } from './parse-card.js';

const FULL_FIXTURE = `---
id: CARD-042
title: Sample card title
status: implement
phase: implement
type: task
layer: domain
depends_on: [CARD-001]
branch: task/042-sample-card
worktree: .worktrees/CARD-042-impl
design_pr_url: https://github.com/org/repo/pull/42
pr_urls: [https://github.com/org/repo/pull/43]
split_slices: 2
adrs: [ADR-0007]
reworks:
  slice: 1
  design: 0
  implement: 2
  split: 0
  deliver: 0
estimated_lines: 300
actual_lines: 280
created: "2026-07-01"
started: "2026-07-02"
delivered: "2026-07-03"
---

## Why
Sample why paragraph.
`;

describe('parseCard', () => {
  it('maps every frontmatter field snake_case to camelCase with correct types', () => {
    const model = parseCard(FULL_FIXTURE, { dirName: 'CARD-042-sample-card' });

    expect(model.id).toBe('CARD-042');
    expect(model.title).toBe('Sample card title');
    expect(model.status).toBe('implement');
    expect(model.phase).toBe('implement');
    expect(model.type).toBe('task');
    expect(model.layer).toBe('domain');
    expect(model.dependsOn).toEqual(['CARD-001']);
    expect(model.branch).toBe('task/042-sample-card');
    expect(model.worktree).toBe('.worktrees/CARD-042-impl');
    expect(model.designPrUrl).toBe('https://github.com/org/repo/pull/42');
    expect(model.prUrls).toEqual(['https://github.com/org/repo/pull/43']);
    expect(model.splitSlices).toBe(2);
    expect(model.adrs).toEqual(['ADR-0007']);
    expect(model.reworks).toEqual({ slice: 1, design: 0, implement: 2, split: 0, deliver: 0 });
    expect(model.estimatedLines).toBe(300);
    expect(model.actualLines).toBe(280);
    expect(model.dirName).toBe('CARD-042-sample-card');
  });
});
