import { describe, expect, it } from 'vitest';
import { parseMilestones } from './milestones.js';

describe('parseMilestones', () => {
  it('parses two milestones with their card ids in listed order', () => {
    const raw = `# Milestones

## M1 — Toolchain and delivery pipeline
**Goal:** Something.
**Cards:** CARD-001, CARD-002, CARD-003

## M2 — Headless board API
**Goal:** Something else.
**Cards:** CARD-019, CARD-020
`;

    expect(parseMilestones(raw)).toEqual([
      { name: 'M1 — Toolchain and delivery pipeline', cardIds: ['CARD-001', 'CARD-002', 'CARD-003'] },
      { name: 'M2 — Headless board API', cardIds: ['CARD-019', 'CARD-020'] },
    ]);
  });

  it('yields an empty cardIds array for a milestone with no **Cards:** line', () => {
    const raw = `## M1 — No cards yet
**Goal:** Something.
`;

    expect(parseMilestones(raw)).toEqual([{ name: 'M1 — No cards yet', cardIds: [] }]);
  });

  it('returns [] for an empty string', () => {
    expect(parseMilestones('')).toEqual([]);
  });

  it('returns [] for a # Milestones-only intro with no ## M heading', () => {
    const raw = `# Milestones

Ordered delivery milestones, authored by /refine.
`;

    expect(parseMilestones(raw)).toEqual([]);
  });

  it('attaches a stray **Cards:** line under a non-milestone heading to neither milestone', () => {
    const raw = `## M1 — First
**Cards:** CARD-001

## Notes
**Cards:** CARD-999

## M2 — Second
**Cards:** CARD-002
`;

    expect(parseMilestones(raw)).toEqual([
      { name: 'M1 — First', cardIds: ['CARD-001'] },
      { name: 'M2 — Second', cardIds: ['CARD-002'] },
    ]);
  });

  it('yields an empty cardIds array for a **Cards:** line with only whitespace / no CARD- tokens', () => {
    const raw = `## M1 — Empty cards line
**Cards:**
`;

    expect(parseMilestones(raw)).toEqual([{ name: 'M1 — Empty cards line', cardIds: [] }]);
  });
});
