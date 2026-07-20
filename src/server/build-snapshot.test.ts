import { afterEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildSnapshot, DEFAULT_WIP_LIMIT } from './build-snapshot.js';
import type { BoardSnapshot } from './card-model.js';

const tmpDirs: string[] = [];
// Dirs whose permissions were tightened mid-test (e.g. chmod 000) must be restored
// before rmSync's recursive cleanup, or the cleanup itself fails to traverse them.
const lockedDirs: string[] = [];

/**
 * Writes a fixture board to a fresh temp directory. `files` keys are paths relative
 * to the board dir (forward-slash), values are file contents. Returns the absolute
 * board dir path. Cleaned up in afterEach.
 */
function writeFixtureBoard(files: Record<string, string>): string {
  const boardDir = mkdtempSync(path.join(tmpdir(), 'kanban-board-'));
  tmpDirs.push(boardDir);

  for (const [relPath, contents] of Object.entries(files)) {
    const fullPath = path.join(boardDir, relPath);
    mkdirSync(path.dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, contents);
  }

  return boardDir;
}

afterEach(() => {
  for (const dir of lockedDirs.splice(0)) {
    chmodSync(dir, 0o755);
  }
  for (const dir of tmpDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const VALID_CARD_1 = `---
id: CARD-001
title: First card
status: backlog
---

## Why
First card why.
`;

const VALID_CARD_2 = `---
id: CARD-002
title: Second card
status: backlog
---

## Why
Second card why.
`;

describe('buildSnapshot', () => {
  it('assembles a snapshot from a valid board', () => {
    const boardDir = writeFixtureBoard({
      'config.md': '---\nwip_limit: 2\n---\n',
      'CARD-001-first/card.md': VALID_CARD_1,
      'CARD-002-second/card.md': VALID_CARD_2,
    });

    const snap = buildSnapshot({ boardDir, projectName: 'my-project' });

    expect(snap).toHaveProperty('generatedAt');
    expect(snap).toHaveProperty('projectName');
    expect(snap).toHaveProperty('config');
    expect(snap).toHaveProperty('cards');
    expect(snap).toHaveProperty('parseErrors');
    expect(snap).toHaveProperty('milestones');
    expect(snap.projectName).toBe('my-project');
    expect(snap.cards.length).toBe(2);
    expect(snap.parseErrors).toEqual([]);
  });

  it('uses the injected clock for generatedAt', () => {
    const boardDir = writeFixtureBoard({
      'config.md': '---\nwip_limit: 2\n---\n',
    });

    const snap = buildSnapshot({
      boardDir,
      projectName: 'my-project',
      now: () => new Date('2026-07-18T12:00:00.000Z'),
    });

    expect(snap.generatedAt).toBe('2026-07-18T12:00:00.000Z');
  });

  it('defaults generatedAt to a valid ISO now when no clock is injected', () => {
    const boardDir = writeFixtureBoard({
      'config.md': '---\nwip_limit: 2\n---\n',
    });

    const snap = buildSnapshot({ boardDir, projectName: 'my-project' });

    expect(new Date(snap.generatedAt).toISOString()).toBe(snap.generatedAt);
  });

  it('reads a numeric wip_limit from config.md', () => {
    const boardDir = writeFixtureBoard({ 'config.md': '---\nwip_limit: 5\n---\n' });

    const snap = buildSnapshot({ boardDir, projectName: 'p' });

    expect(snap.config.wipLimit).toBe(5);
  });

  it('defaults wipLimit when config.md is absent', () => {
    const boardDir = writeFixtureBoard({});

    const snap = buildSnapshot({ boardDir, projectName: 'p' });

    expect(snap.config.wipLimit).toBe(DEFAULT_WIP_LIMIT);
    // Pins design AC-2's literal default value: asserting only the DEFAULT_WIP_LIMIT
    // symbol would still pass if that constant's value drifted from 3.
    expect(snap.config.wipLimit).toBe(3);
  });

  it('defaults wipLimit when config.md has no wip_limit key', () => {
    const boardDir = writeFixtureBoard({ 'config.md': '---\ntitle: Config\n---\n' });

    const snap = buildSnapshot({ boardDir, projectName: 'p' });

    expect(snap.config.wipLimit).toBe(DEFAULT_WIP_LIMIT);
  });

  it('defaults wipLimit when wip_limit is non-numeric', () => {
    const boardDir = writeFixtureBoard({ 'config.md': '---\nwip_limit: "three"\n---\n' });

    const snap = buildSnapshot({ boardDir, projectName: 'p' });

    expect(snap.config.wipLimit).toBe(DEFAULT_WIP_LIMIT);
  });

  it('passes through wip_limit: 0 rather than defaulting', () => {
    const boardDir = writeFixtureBoard({ 'config.md': '---\nwip_limit: 0\n---\n' });

    const snap = buildSnapshot({ boardDir, projectName: 'p' });

    expect(snap.config.wipLimit).toBe(0);
  });

  const MALFORMED_CARD = `---
id: CARD-999
title: "unterminated quote
---
`;

  it('routes a malformed card.md to parseErrors while every other card still parses', () => {
    const boardDir = writeFixtureBoard({
      'config.md': '---\nwip_limit: 2\n---\n',
      'CARD-001-first/card.md': VALID_CARD_1,
      'CARD-002-second/card.md': VALID_CARD_2,
      'CARD-003-bad/card.md': MALFORMED_CARD,
    });

    const snap = buildSnapshot({ boardDir, projectName: 'p' });

    expect(snap.cards.map((c) => c.id)).toEqual(['CARD-001', 'CARD-002']);
    expect(snap.parseErrors.length).toBe(1);
    expect(snap.parseErrors[0]?.path).toBe('CARD-003-bad/card.md');
    expect(typeof snap.parseErrors[0]?.error).toBe('string');
    expect(snap.parseErrors[0]?.error.length).toBeGreaterThan(0);
    expect(snap.parseErrors[0]?.path).not.toContain(boardDir);
  });

  it('routes two malformed card dirs to two sorted parseErrors, one good card', () => {
    // Distinct malformed content in each fixture: gray-matter caches parse
    // results keyed by the exact input string, and (per KNOWLEDGE [CARD-021])
    // that cache is populated even on a parse that goes on to throw — so two
    // byte-identical malformed inputs would only throw on the first.
    const MALFORMED_CARD_2 = `---
id: CARD-998
title: 'also unterminated
---
`;
    const boardDir = writeFixtureBoard({
      'config.md': '---\nwip_limit: 2\n---\n',
      'CARD-001-first/card.md': VALID_CARD_1,
      'CARD-002-bad/card.md': MALFORMED_CARD,
      'CARD-003-alsobad/card.md': MALFORMED_CARD_2,
    });

    const snap = buildSnapshot({ boardDir, projectName: 'p' });

    expect(snap.cards.length).toBe(1);
    expect(snap.cards[0]?.id).toBe('CARD-001');
    expect(snap.parseErrors.map((e) => e.path)).toEqual([
      'CARD-002-bad/card.md',
      'CARD-003-alsobad/card.md',
    ]);
  });

  it('reports the same unchanged malformed card.md as a parseError on every re-walk', () => {
    // Regression: gray-matter's module-level parse cache is keyed by the exact
    // input string and is populated BEFORE parsing (KNOWLEDGE [CARD-021]) — so a
    // persistently-malformed card.md whose content never changes must still be
    // caught on the second (and every subsequent) buildSnapshot call, matching
    // a real debounced re-parse cycle (REQ-008) where nothing else changed.
    const boardDir = writeFixtureBoard({
      'config.md': '---\nwip_limit: 2\n---\n',
      'CARD-001-first/card.md': VALID_CARD_1,
      'CARD-004-persistent/card.md': MALFORMED_CARD,
    });

    const first = buildSnapshot({ boardDir, projectName: 'p' });
    const second = buildSnapshot({ boardDir, projectName: 'p' });

    expect(first.parseErrors.map((e) => e.path)).toEqual(['CARD-004-persistent/card.md']);
    expect(second.parseErrors.map((e) => e.path)).toEqual(['CARD-004-persistent/card.md']);
    expect(second.cards.map((c) => c.id)).toEqual(['CARD-001']);
  });

  it('reports the same unchanged malformed card.md on every re-walk even with config.md absent (isolates the loop\'s own cache guard)', () => {
    // config.md is deliberately OMITTED here: readConfig never calls matter() when
    // config.md is absent (it returns early on the readFileSync ENOENT), so its own
    // clearMatterCache() call never runs. This isolates the per-card loop's
    // clearMatterCache() (build-snapshot.ts, in the card try block) as the SOLE guard
    // under test — removing readConfig's call alone must still pass this test; only
    // removing the loop's call may break it.
    const boardDir = writeFixtureBoard({
      'CARD-004-persistent/card.md': MALFORMED_CARD,
    });

    const first = buildSnapshot({ boardDir, projectName: 'p' });
    const second = buildSnapshot({ boardDir, projectName: 'p' });

    expect(first.parseErrors.map((e) => e.path)).toEqual(['CARD-004-persistent/card.md']);
    expect(second.parseErrors.map((e) => e.path)).toEqual(['CARD-004-persistent/card.md']);
  });

  it('degrades a malformed config.md to the default wipLimit and a parseError, cards still parse', () => {
    const boardDir = writeFixtureBoard({
      'config.md': '---\nwip_limit: "unterminated\n---\n',
      'CARD-001-first/card.md': VALID_CARD_1,
    });

    const snap = buildSnapshot({ boardDir, projectName: 'p' });

    expect(snap.cards.length).toBe(1);
    expect(snap.config.wipLimit).toBe(DEFAULT_WIP_LIMIT);
    expect(snap.parseErrors).toContainEqual(
      expect.objectContaining({ path: 'config.md', error: expect.any(String) }),
    );
    const configError = snap.parseErrors.find((e) => e.path === 'config.md');
    expect(configError?.error.length).toBeGreaterThan(0);
  });

  it('skips a CARD-* dir with no card.md rather than reporting a parseError', () => {
    const boardDir = writeFixtureBoard({
      'config.md': '---\nwip_limit: 2\n---\n',
      'CARD-001-first/card.md': VALID_CARD_1,
      'CARD-099-stub/README.md': 'placeholder, no card.md yet',
    });

    const snap = buildSnapshot({ boardDir, projectName: 'p' });

    expect(snap.cards.length).toBe(1);
    expect(snap.parseErrors).toEqual([]);
  });

  it('routes an unreadable (permission-denied) card dir to parseErrors rather than throwing (ADR-0008 totality)', () => {
    const boardDir = writeFixtureBoard({
      'config.md': '---\nwip_limit: 2\n---\n',
      'CARD-001-first/card.md': VALID_CARD_1,
      'CARD-002-locked/card.md': VALID_CARD_2,
    });
    const lockedDir = path.join(boardDir, 'CARD-002-locked');
    chmodSync(lockedDir, 0o000);
    lockedDirs.push(lockedDir);

    let snap: BoardSnapshot | undefined;
    expect(() => {
      snap = buildSnapshot({ boardDir, projectName: 'p' });
    }).not.toThrow();

    expect(snap?.cards.map((c) => c.id)).toEqual(['CARD-001']);
    expect(snap?.parseErrors).toContainEqual(
      expect.objectContaining({ path: 'CARD-002-locked/card.md', error: expect.any(String) }),
    );
  });

  it('threads the card dir entries listing to parseCard (CARD-020 phaseDocsPresent contract)', () => {
    const boardDir = writeFixtureBoard({
      'config.md': '---\nwip_limit: 2\n---\n',
      'CARD-001-first/card.md': VALID_CARD_1,
      'CARD-001-first/design.md': '# Design doc',
    });

    const snap = buildSnapshot({ boardDir, projectName: 'p' });

    expect(snap.cards[0]?.phaseDocsPresent.design.phase).toBe(true);
  });

  it('returns cards sorted ascending by dirName regardless of directory creation order', () => {
    const boardDir = writeFixtureBoard({
      'config.md': '---\nwip_limit: 2\n---\n',
      'CARD-003-third/card.md': '---\nid: CARD-003\n---\n',
      'CARD-001-first/card.md': VALID_CARD_1,
      'CARD-002-second/card.md': VALID_CARD_2,
    });

    const snap = buildSnapshot({ boardDir, projectName: 'p' });

    expect(snap.cards.map((c) => c.dirName)).toEqual([
      'CARD-001-first',
      'CARD-002-second',
      'CARD-003-third',
    ]);
  });

  it('ignores non-CARD-* board files and dirs (BOARD.md, MILESTONES.md, KNOWLEDGE.md, adrs/)', () => {
    const boardDir = writeFixtureBoard({
      'config.md': '---\nwip_limit: 2\n---\n',
      'BOARD.md': '# Board',
      'MILESTONES.md': '# Milestones',
      'KNOWLEDGE.md': '# Knowledge',
      'adrs/0001-example.md': '# ADR',
      'CARD-001-first/card.md': VALID_CARD_1,
    });

    const snap = buildSnapshot({ boardDir, projectName: 'p' });

    expect(snap.cards.length).toBe(1);
  });

  it('excludes a non-CARD-*-prefixed directory even when it contains a valid card.md', () => {
    // Distinguishes the `.startsWith('CARD-')` filter from the unrelated
    // `entries.includes('card.md')` guard: `misc-notes/` has a valid card.md, so
    // only the prefix filter can be excluding it.
    const boardDir = writeFixtureBoard({
      'config.md': '---\nwip_limit: 2\n---\n',
      'CARD-001-first/card.md': VALID_CARD_1,
      'misc-notes/card.md': VALID_CARD_2,
    });

    const snap = buildSnapshot({ boardDir, projectName: 'p' });

    expect(snap.cards.length).toBe(1);
    expect(snap.cards.map((c) => c.id)).toEqual(['CARD-001']);
  });

  it('returns empty cards and parseErrors for a board with only config.md', () => {
    const boardDir = writeFixtureBoard({ 'config.md': '---\nwip_limit: 2\n---\n' });

    const snap = buildSnapshot({ boardDir, projectName: 'p' });

    expect(snap.cards).toEqual([]);
    expect(snap.parseErrors).toEqual([]);
  });

  it('derives milestones from MILESTONES.md and the parsed cards', () => {
    const boardDir = writeFixtureBoard({
      'config.md': '---\nwip_limit: 2\n---\n',
      'MILESTONES.md': '## M1 — X\n**Cards:** CARD-001, CARD-002\n',
      'CARD-001-first/card.md': '---\nid: CARD-001\nstatus: done\n---\n',
      'CARD-002-second/card.md': '---\nid: CARD-002\nstatus: backlog\n---\n',
    });

    const snap = buildSnapshot({ boardDir, projectName: 'p' });

    expect(snap.milestones).toEqual([
      { name: 'M1 — X', cardIds: ['CARD-001', 'CARD-002'], done: 1, total: 2 },
    ]);
  });

  it('returns an empty milestones array when MILESTONES.md is absent', () => {
    const boardDir = writeFixtureBoard({
      'config.md': '---\nwip_limit: 2\n---\n',
      'CARD-001-first/card.md': VALID_CARD_1,
    });

    const snap = buildSnapshot({ boardDir, projectName: 'p' });

    expect(snap.milestones).toEqual([]);
  });

  it('counts a milestone card id with no matching card dir in total without throwing', () => {
    const boardDir = writeFixtureBoard({
      'config.md': '---\nwip_limit: 2\n---\n',
      'MILESTONES.md': '## M1 — X\n**Cards:** CARD-001, CARD-404\n',
      'CARD-001-first/card.md': '---\nid: CARD-001\nstatus: done\n---\n',
    });

    let snap: BoardSnapshot | undefined;
    expect(() => {
      snap = buildSnapshot({ boardDir, projectName: 'p' });
    }).not.toThrow();

    expect(snap?.milestones).toEqual([
      { name: 'M1 — X', cardIds: ['CARD-001', 'CARD-404'], done: 1, total: 2 },
    ]);
  });

  it('property: every card dir lands in exactly one of cards/parseErrors (REQ-033)', () => {
    const dirSpecArb = fc
      .tuple(fc.integer({ min: 0, max: 999 }), fc.constantFrom<'valid' | 'malformed'>('valid', 'malformed'))
      .map(([n, tag]) => ({ n, tag }));

    fc.assert(
      fc.property(
        fc.uniqueArray(dirSpecArb, { minLength: 2, maxLength: 6, selector: (spec) => spec.n }),
        (specs) => {
          const files: Record<string, string> = { 'config.md': '---\nwip_limit: 2\n---\n' };
          for (const spec of specs) {
            const dirName = `CARD-${String(spec.n).padStart(3, '0')}-fixture`;
            files[`${dirName}/card.md`] =
              spec.tag === 'valid'
                ? `---\nid: CARD-${spec.n}\n---\n`
                : `---\nid: CARD-${spec.n}\ntitle: "unterminated ${spec.n}\n---\n`;
          }
          const boardDir = writeFixtureBoard(files);

          const snap = buildSnapshot({ boardDir, projectName: 'p' });

          const expectedValid = specs.filter((s) => s.tag === 'valid').length;
          const expectedMalformed = specs.filter((s) => s.tag === 'malformed').length;

          expect(snap.cards.length).toBe(expectedValid);
          expect(snap.parseErrors.filter((e) => e.path.endsWith('/card.md')).length).toBe(
            expectedMalformed,
          );

          const dirNamesFromCards = new Set(snap.cards.map((c) => c.dirName));
          const dirNamesFromErrors = new Set(
            snap.parseErrors.map((e) => e.path.replace(/\/card\.md$/, '')),
          );
          const expectedDirNames = specs.map(
            (s) => `CARD-${String(s.n).padStart(3, '0')}-fixture`,
          );
          for (const dirName of expectedDirNames) {
            const inCards = dirNamesFromCards.has(dirName);
            const inErrors = dirNamesFromErrors.has(dirName);
            expect(inCards !== inErrors).toBe(true);
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});
