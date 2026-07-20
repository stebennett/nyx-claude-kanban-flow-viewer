import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { deriveMilestones, parseMilestones } from './milestones.js';

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

const TWO_MILESTONE_FIXTURE = `## M1 — Toolchain and delivery pipeline
**Cards:** CARD-001, CARD-002, CARD-003

## M2 — Headless board API
**Cards:** CARD-019, CARD-020
`;

describe('deriveMilestones', () => {
  it('computes done/total per milestone from mixed card statuses (hand-computed)', () => {
    const cards = [
      { id: 'CARD-001', status: 'done' },
      { id: 'CARD-002', status: 'done' },
      { id: 'CARD-003', status: 'design' },
      { id: 'CARD-019', status: 'done' },
      // CARD-020 absent from cards entirely
    ];

    expect(deriveMilestones(TWO_MILESTONE_FIXTURE, cards)).toEqual([
      { name: 'M1 — Toolchain and delivery pipeline', cardIds: ['CARD-001', 'CARD-002', 'CARD-003'], done: 2, total: 3 },
      { name: 'M2 — Headless board API', cardIds: ['CARD-019', 'CARD-020'], done: 1, total: 2 },
    ]);
  });

  it('reports done === total when every referenced card is done', () => {
    const cards = [
      { id: 'CARD-001', status: 'done' },
      { id: 'CARD-002', status: 'done' },
      { id: 'CARD-003', status: 'done' },
      { id: 'CARD-019', status: 'done' },
      { id: 'CARD-020', status: 'done' },
    ];

    const result = deriveMilestones(TWO_MILESTONE_FIXTURE, cards);

    expect(result[0]).toMatchObject({ done: 3, total: 3 });
    expect(result[1]).toMatchObject({ done: 2, total: 2 });
  });

  it('counts a missing card and a backlog card in total but never in done, and never throws', () => {
    const raw = `## M1 — Solo
**Cards:** CARD-001, CARD-002
`;
    // CARD-001 has no parsed card at all; CARD-002 is present but not done.
    const cards = [{ id: 'CARD-002', status: 'backlog' }];

    expect(() => deriveMilestones(raw, cards)).not.toThrow();
    expect(deriveMilestones(raw, cards)).toEqual([
      { name: 'M1 — Solo', cardIds: ['CARD-001', 'CARD-002'], done: 0, total: 2 },
    ]);
  });

  it('does not count split or superseded statuses as done (only the terminal `done` status)', () => {
    const raw = `## M1 — Terminal statuses
**Cards:** CARD-001, CARD-002
`;
    const cards = [
      { id: 'CARD-001', status: 'split' },
      { id: 'CARD-002', status: 'superseded' },
    ];

    expect(deriveMilestones(raw, cards)).toEqual([
      { name: 'M1 — Terminal statuses', cardIds: ['CARD-001', 'CARD-002'], done: 0, total: 2 },
    ]);
  });

  it('property: done/total invariants hold over random milestones and cards', () => {
    const cardArb = fc
      .tuple(
        fc.integer({ min: 0, max: 200 }),
        fc.constantFrom<'done' | 'backlog' | 'design' | 'split'>('done', 'backlog', 'design', 'split'),
      )
      .map(([n, status]) => ({ id: `CARD-${n}`, status, tagDone: status === 'done' }));

    const milestoneArb = fc
      .array(fc.integer({ min: 0, max: 200 }), { minLength: 0, maxLength: 8 })
      .map((ns) => ({ name: 'M1 — fixture', cardIds: ns.map((n) => `CARD-${n}`) }));

    fc.assert(
      fc.property(
        fc.uniqueArray(cardArb, { minLength: 0, maxLength: 30, selector: (c) => c.id }),
        milestoneArb,
        (cards, milestone) => {
          // Ground truth from the arbitrary's own tags, not the impl expression.
          const doneIds = new Set(cards.filter((c) => c.tagDone).map((c) => c.id));
          const raw = `## M1 — fixture\n**Cards:** ${milestone.cardIds.join(', ')}\n`;
          const cardInputs = cards.map(({ id, status }) => ({ id, status }));

          const [result] = deriveMilestones(raw, cardInputs);

          expect(result).toBeDefined();
          expect(result!.total).toBe(milestone.cardIds.length);
          expect(result!.done).toBeGreaterThanOrEqual(0);
          expect(result!.done).toBeLessThanOrEqual(result!.total);
          expect(result!.done).toBe(milestone.cardIds.filter((id) => doneIds.has(id)).length);
        },
      ),
      { seed: 20260720, numRuns: 50 },
    );
  });
});
