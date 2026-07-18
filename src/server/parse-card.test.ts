import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { countCriteria, extractSection, parseCard } from './parse-card.js';

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

describe('countCriteria property', () => {
  it('done equals the checked-line count and total equals checked+unchecked, regardless of noise', () => {
    const checkboxLikePattern = /^\s*-\s\[[ xX]\]/;
    const noNewline = (s: string): boolean => !/[\r\n]/.test(s);
    const itemTextArb = fc.string({ minLength: 0, maxLength: 10 }).filter(noNewline);

    const checkedLineArb = itemTextArb.map((text) => ({
      kind: 'checked' as const,
      line: `- [x] ${text}`,
    }));
    const uncheckedLineArb = itemTextArb.map((text) => ({
      kind: 'unchecked' as const,
      line: `- [ ] ${text}`,
    }));
    const noiseLineArb = fc
      .string({ minLength: 0, maxLength: 20 })
      .filter((s) => noNewline(s) && !checkboxLikePattern.test(s))
      .map((line) => ({ kind: 'noise' as const, line }));

    const taggedLineArb = fc.oneof(checkedLineArb, uncheckedLineArb, noiseLineArb);

    fc.assert(
      fc.property(fc.array(taggedLineArb, { maxLength: 30 }), (taggedLines) => {
        const expectedDone = taggedLines.filter((l) => l.kind === 'checked').length;
        const expectedNotDone = taggedLines.filter((l) => l.kind === 'unchecked').length;
        const sectionText = taggedLines.map((l) => l.line).join('\n');

        const result = countCriteria(sectionText);

        expect(result.done).toBe(expectedDone);
        expect(result.total).toBe(expectedDone + expectedNotDone);
        expect(result.done).toBeLessThanOrEqual(result.total);
        expect(result.done).toBeGreaterThanOrEqual(0);
        expect(result.total).toBeGreaterThanOrEqual(0);
      }),
      { seed: 20260718, numRuns: 200 },
    );
  });
});

describe('countCriteria', () => {
  it('counts done/total from checkbox lines in the given section text', () => {
    expect(countCriteria('- [x] one\n- [ ] two\n- [ ] three')).toEqual({ done: 1, total: 3 });
  });

  it('counts an uppercase [X] as done', () => {
    expect(countCriteria('- [X] one\n- [ ] two')).toEqual({ done: 1, total: 2 });
  });

  it('returns {done:0,total:0} for an empty section', () => {
    expect(countCriteria('')).toEqual({ done: 0, total: 0 });
  });
});

describe('parseCard criteria counting scoped to heading (AC-2)', () => {
  it('counts only checkboxes under ## Acceptance criteria, ignoring stray checkboxes in Why/Notes', () => {
    // Non-vacuous proof: 2 done + 3 not-done under Acceptance criteria = {done:2,total:5}.
    // A stray "- [x]" sits in *both* Why and Notes, outside the heading's scope. If heading
    // scoping were removed, those 2 stray checked lines would be swept in too, changing the
    // result to {done:4,total:7} (2 in-section done + 2 stray done; 5 in-section + 2 stray
    // total) — proving the heading boundary, not just the checkbox regex, does the work.
    const SCOPED_CRITERIA_FIXTURE = `---
id: CARD-058
title: Scoped criteria card
status: implement
---

## Why
Some why text.
- [x] stray checked item in Why (must not be counted)

## Acceptance criteria
- [x] criterion one
- [x] criterion two
- [ ] criterion three
- [ ] criterion four
- [ ] criterion five

## Notes
Some notes text.
- [x] stray checked item in Notes (must not be counted)
`;

    const model = parseCard(SCOPED_CRITERIA_FIXTURE, { dirName: 'CARD-058' });

    expect(model.criteria).toEqual({ done: 2, total: 5 });
  });

  it('returns {done:0,total:0} when the Acceptance criteria heading is absent', () => {
    const NO_CRITERIA_FIXTURE = `---
id: CARD-059
title: No criteria heading card
status: implement
---

## Why
Some why text with no criteria heading at all.
`;

    const model = parseCard(NO_CRITERIA_FIXTURE, { dirName: 'CARD-059' });

    expect(model.criteria).toEqual({ done: 0, total: 0 });
  });

  it('does not end the section at a ### sub-heading, so checkboxes after it still count', () => {
    const SUBHEADING_CRITERIA_FIXTURE = `---
id: CARD-060
title: Sub-heading criteria card
status: implement
---

## Acceptance criteria
- [x] before the sub-heading
### a sub-heading
- [ ] after the sub-heading, still in scope

## Notes
n/a
`;

    const model = parseCard(SUBHEADING_CRITERIA_FIXTURE, { dirName: 'CARD-060' });

    expect(model.criteria).toEqual({ done: 1, total: 2 });
  });
});
