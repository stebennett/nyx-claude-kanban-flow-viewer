import { describe, expect, it } from 'vitest';
import { extractSection, parseCard } from './parse-card.js';

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

  it('applies typed defaults for missing optional frontmatter fields and never throws', () => {
    const MINIMAL_FIXTURE = `---
id: CARD-099
title: Minimal card
status: backlog
---

Body text without any known sections.
`;

    expect(() => parseCard(MINIMAL_FIXTURE, { dirName: 'CARD-099-minimal' })).not.toThrow();

    const model = parseCard(MINIMAL_FIXTURE, { dirName: 'CARD-099-minimal' });

    expect(model.dependsOn).toEqual([]);
    expect(model.prUrls).toEqual([]);
    expect(model.adrs).toEqual([]);
    expect(model.splitSlices).toBe(0);
    expect(model.reworks).toEqual({ slice: 0, design: 0, implement: 0, split: 0, deliver: 0 });
    expect(model.estimatedLines).toBeNull();
    expect(model.actualLines).toBeNull();
    expect(model.criteria).toEqual({ done: 0, total: 0 });
    expect(model.why).toBe('');
    expect(model.notes).toBe('');
    expect(model.branch).toBe('');
    expect(model.worktree).toBe('');
    expect(model.designPrUrl).toBe('');
    expect(model.created).toBe('');
    expect(model.started).toBe('');
    expect(model.delivered).toBe('');
  });

  it('fills only the missing rework producers with 0 when reworks is partial', () => {
    const PARTIAL_REWORKS_FIXTURE = `---
id: CARD-050
title: Partial reworks card
status: implement
reworks:
  implement: 3
---
`;

    const model = parseCard(PARTIAL_REWORKS_FIXTURE, { dirName: 'CARD-050-partial' });

    expect(model.reworks).toEqual({ slice: 0, design: 0, implement: 3, split: 0, deliver: 0 });
  });

  it('coerces an empty-string estimated_lines/actual_lines to null', () => {
    const EMPTY_LINES_FIXTURE = `---
id: CARD-051
title: Empty lines card
status: implement
estimated_lines: ""
actual_lines: ""
---
`;

    const model = parseCard(EMPTY_LINES_FIXTURE, { dirName: 'CARD-051-empty-lines' });

    expect(model.estimatedLines).toBeNull();
    expect(model.actualLines).toBeNull();
  });

  it('sets blocker only when the frontmatter value is a non-empty string', () => {
    const BLOCKED_FIXTURE = `---
id: CARD-052
title: Blocked card
status: implement
blocker: needs API key
---
`;
    const UNBLOCKED_FIXTURE = `---
id: CARD-053
title: Unblocked card
status: implement
---
`;
    const EMPTY_BLOCKER_FIXTURE = `---
id: CARD-054
title: Empty blocker card
status: implement
blocker: ""
---
`;

    expect(parseCard(BLOCKED_FIXTURE, { dirName: 'CARD-052' }).blocker).toBe('needs API key');
    expect(parseCard(UNBLOCKED_FIXTURE, { dirName: 'CARD-053' }).blocker).toBeUndefined();
    expect(parseCard(EMPTY_BLOCKER_FIXTURE, { dirName: 'CARD-054' }).blocker).toBeUndefined();
  });

  it('coerces unquoted YAML date frontmatter to YYYY-MM-DD strings', () => {
    const UNQUOTED_DATE_FIXTURE = `---
id: CARD-056
title: Unquoted date card
status: implement
created: 2026-07-18
started: 2026-07-19
delivered: 2026-07-20
---
`;

    const model = parseCard(UNQUOTED_DATE_FIXTURE, { dirName: 'CARD-056' });

    expect(typeof model.created).toBe('string');
    expect(model.created).toBe('2026-07-18');
    expect(typeof model.started).toBe('string');
    expect(model.started).toBe('2026-07-19');
    expect(typeof model.delivered).toBe('string');
    expect(model.delivered).toBe('2026-07-20');
  });

  it('passes an unrecognized status value through unchanged', () => {
    const UNKNOWN_STATUS_FIXTURE = `---
id: CARD-055
title: Unknown status card
status: frobnicate
---
`;

    const model = parseCard(UNKNOWN_STATUS_FIXTURE, { dirName: 'CARD-055' });

    expect(model.status).toBe('frobnicate');
  });
});

describe('extractSection', () => {
  it('returns the trimmed body of the matching heading', () => {
    const content = `## Why\nThis is the why paragraph.\n\n## Notes\nSome notes here.\n`;

    expect(extractSection(content, 'Why')).toBe('This is the why paragraph.');
  });

  it('returns an empty string when the heading is absent', () => {
    const content = `## Something else\nirrelevant\n`;

    expect(extractSection(content, 'Why')).toBe('');
  });

  it('does not terminate the section at a ### sub-heading', () => {
    const content = `## Notes\n### sub\nafter the sub-heading\n\n## Next\nnope\n`;

    expect(extractSection(content, 'Notes')).toBe('### sub\nafter the sub-heading');
  });
});

describe('parseCard why/notes extraction', () => {
  it('extracts the Why paragraph and Notes from the body (AC-3)', () => {
    const WHY_NOTES_FIXTURE = `---
id: CARD-057
title: Why notes card
status: implement
---

## Why
This is the exact why sentence for the card.

## Acceptance criteria
- [ ] one thing

## Notes
These are the exact notes for the card.
`;

    const model = parseCard(WHY_NOTES_FIXTURE, { dirName: 'CARD-057' });

    expect(model.why).toBe('This is the exact why sentence for the card.');
    expect(model.notes).toBe('These are the exact notes for the card.');
    expect(model.why).not.toContain('##');
    expect(model.notes).not.toContain('##');
  });
});
