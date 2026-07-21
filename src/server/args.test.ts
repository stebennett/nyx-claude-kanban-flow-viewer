import { afterEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import path from 'node:path';
import { DEFAULT_BOARD_DIR, EXIT_USAGE, USAGE, parseArgs, resolvePaths } from './args.js';
import { writeFixtureTree, cleanupFixtures, withServer } from '../../test/board-fixture.js';
import { assertNoRepoWrites, assertNoNonLoopbackNetwork } from '../../test/server-guard.js';

afterEach(cleanupFixtures);

describe('args module constants', () => {
  it('DEFAULT_BOARD_DIR is docs/cards (REQ-012)', () => {
    expect(DEFAULT_BOARD_DIR).toBe('docs/cards');
  });

  it('EXIT_USAGE is 64 (sysexits EX_USAGE)', () => {
    expect(EXIT_USAGE).toBe(64);
  });

  it('USAGE names the positional and the --board-dir flag (REQ-010)', () => {
    expect(USAGE).toContain('<path-to-repo>');
    expect(USAGE).toContain('--board-dir');
  });
});

describe('parseArgs positional and default board dir', () => {
  it('returns the positional path as targetRepo', () => {
    const result = parseArgs(['/tmp/repo']);

    expect(result.ok).toBe(true);
    expect(result).toEqual({ ok: true, args: { targetRepo: '/tmp/repo', boardDir: 'docs/cards' } });
  });

  it('defaults boardDir to docs/cards when --board-dir is absent', () => {
    const result = parseArgs(['/tmp/repo']);

    expect(result.ok && result.args.boardDir).toBe('docs/cards');
    expect(result.ok && result.args.boardDir).toBe(DEFAULT_BOARD_DIR);
  });

  it('errors when no positional is given', () => {
    expect(parseArgs([])).toEqual({ ok: false, error: 'missing <path-to-repo>' });
  });
});

describe('parseArgs --board-dir', () => {
  it('--board-dir <path> overrides the default', () => {
    expect(parseArgs(['/tmp/repo', '--board-dir', 'boards/alt'])).toEqual({
      ok: true,
      args: { targetRepo: '/tmp/repo', boardDir: 'boards/alt' },
    });
  });

  it('accepts the flag before the positional', () => {
    expect(parseArgs(['--board-dir', 'boards/alt', '/tmp/repo'])).toEqual({
      ok: true,
      args: { targetRepo: '/tmp/repo', boardDir: 'boards/alt' },
    });
  });

  it('last --board-dir wins', () => {
    expect(parseArgs(['/tmp/repo', '--board-dir', 'a', '--board-dir', 'b'])).toEqual({
      ok: true,
      args: { targetRepo: '/tmp/repo', boardDir: 'b' },
    });
  });
});

describe('parseArgs error branches', () => {
  it('errors when --board-dir has no value', () => {
    expect(parseArgs(['/tmp/repo', '--board-dir'])).toEqual({
      ok: false,
      error: '--board-dir requires a value',
    });
  });

  it('errors when --board-dir is followed by another option', () => {
    // The next token must NOT be swallowed as the value.
    expect(parseArgs(['/tmp/repo', '--board-dir', '--nope'])).toEqual({
      ok: false,
      error: '--board-dir requires a value',
    });
  });

  it('errors on an empty --board-dir value', () => {
    expect(parseArgs(['/tmp/repo', '--board-dir', ''])).toEqual({
      ok: false,
      error: '--board-dir requires a non-empty value',
    });
  });

  it('errors on an unknown option', () => {
    // --port is deliberately unimplemented today; CARD-025 flips this case.
    expect(parseArgs(['/tmp/repo', '--port', '4400'])).toEqual({
      ok: false,
      error: 'unknown option: --port',
    });
  });

  it('errors on a second positional', () => {
    expect(parseArgs(['/tmp/a', '/tmp/b'])).toEqual({
      ok: false,
      error: 'unexpected argument: /tmp/b',
    });
  });
});

// Segments start with an alphanumeric so a generated dir can never begin with
// `--` (which parseArgs would legitimately read as an option, not a value) —
// the arbitrary must produce inputs the code under test accepts (KNOWLEDGE
// [CARD-022]). Seed pinned for reproducible CI failures ([CARD-021]).
const repoArb = fc.stringMatching(/^\/tmp\/[a-z0-9_-]{1,12}$/);
const boardDirArb = fc
  .array(fc.stringMatching(/^[a-z0-9][a-z0-9_-]{0,7}$/), { minLength: 1, maxLength: 3 })
  .map((segments) => segments.join('/'));

describe('parseArgs invariants', () => {
  it('is order-independent: the flag before or after the positional parses identically', () => {
    fc.assert(
      fc.property(repoArb, boardDirArb, (repo, dir) => {
        const flagLast = parseArgs([repo, '--board-dir', dir]);
        const flagFirst = parseArgs(['--board-dir', dir, repo]);

        // Literal ground truth as well as the differential: a differential
        // alone passes vacuously if both sides degrade the same way
        // (KNOWLEDGE [CARD-022]).
        const expected = { ok: true, args: { targetRepo: repo, boardDir: dir } };
        expect(flagLast).toEqual(expected);
        expect(flagFirst).toEqual(expected);
        expect(flagFirst).toEqual(flagLast);
      }),
      { seed: 20260721, numRuns: 200 },
    );
  });

  it('is total: never throws, always returns a result with a boolean ok', () => {
    fc.assert(
      fc.property(fc.array(fc.string(), { maxLength: 6 }), (argv) => {
        const result = parseArgs(argv);

        expect(typeof result).toBe('object');
        expect(typeof result.ok).toBe('boolean');
      }),
      { seed: 20260721, numRuns: 200 },
    );
  });
});

describe('resolvePaths', () => {
  it('resolves boardDir against the repo root', () => {
    const resolved = resolvePaths({ targetRepo: '/tmp/repo', boardDir: 'boards/alt' });

    expect(resolved.boardDirPath).toBe('/tmp/repo/boards/alt');
  });

  it('projectName is the repo directory basename, not the board dir', () => {
    const resolved = resolvePaths({ targetRepo: '/tmp/my-repo', boardDir: 'boards/alt' });

    expect(resolved.projectName).toBe('my-repo');
  });

  it('ignores a trailing slash on targetRepo', () => {
    const resolved = resolvePaths({ targetRepo: '/tmp/my-repo/', boardDir: 'docs/cards' });

    expect(resolved.projectName).toBe('my-repo');
    expect(resolved.boardDirPath).toBe('/tmp/my-repo/docs/cards');
  });

  it('returns an absolute boardDirPath for a relative targetRepo', () => {
    const resolved = resolvePaths({ targetRepo: '.', boardDir: 'docs/cards' });

    expect(path.isAbsolute(resolved.boardDirPath)).toBe(true);
    expect(resolved.boardDirPath.endsWith('/docs/cards')).toBe(true);
  });

  it('an absolute --board-dir value resolves to itself', () => {
    const resolved = resolvePaths({ targetRepo: '/tmp/repo', boardDir: '/elsewhere/board' });

    expect(resolved.boardDirPath).toBe('/elsewhere/board');
  });
});

const DEFAULT_BOARD_CARD = `---
id: CARD-001
title: Default board card
status: backlog
---

## Why
Lives at the default docs/cards path.
`;

const ALT_BOARD_CARD = `---
id: CARD-777
title: Alt board card
status: backlog
---

## Why
Lives at the non-default boards/alt path.
`;

const FIXED = () => new Date('2026-07-21T12:00:00.000Z');

interface BoardBody {
  projectName: string;
  cards: { id: string }[];
  config: { wipLimit: number };
}

/**
 * ONE temp repo holding TWO boards with deliberately disjoint contents: a
 * single-board fixture cannot tell a working --board-dir from a hardcoded
 * `docs/cards`, so no snapshot value can satisfy both assertions (AC-2).
 */
function writeTwoBoardRepo(): string {
  return writeFixtureTree(
    {
      'docs/cards/config.md': '---\nwip_limit: 2\n---\n',
      'docs/cards/CARD-001-default/card.md': DEFAULT_BOARD_CARD,
      'boards/alt/config.md': '---\nwip_limit: 7\n---\n',
      'boards/alt/CARD-777-alt/card.md': ALT_BOARD_CARD,
    },
    'kfv-two-board-repo-',
  );
}

describe('parseArgs + resolvePaths end to end: the resolved dir is the board that is served', () => {
  it('serves <repo>/docs/cards when --board-dir is absent', async () => {
    const repo = writeTwoBoardRepo();

    const parsed = parseArgs([repo]);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.args.boardDir).toBe('docs/cards');
    const { boardDirPath, projectName } = resolvePaths(parsed.args);

    await assertNoNonLoopbackNetwork(() =>
      assertNoRepoWrites(repo, () =>
        withServer({ boardDir: boardDirPath, projectName, now: FIXED }, async (baseUrl) => {
          const res = await fetch(`${baseUrl}/api/board`);

          expect(res.status).toBe(200);

          const body = (await res.json()) as BoardBody;
          const ids = body.cards.map((c) => c.id);

          expect(ids).toEqual(['CARD-001']);
          expect(ids).not.toContain('CARD-777');
          expect(body.config.wipLimit).toBe(2);
        }),
      ),
    );
  });

  it('serves the --board-dir path instead of the default', async () => {
    const repo = writeTwoBoardRepo();

    const parsed = parseArgs([repo, '--board-dir', 'boards/alt']);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.args.boardDir).toBe('boards/alt');
    const { boardDirPath, projectName } = resolvePaths(parsed.args);

    await assertNoNonLoopbackNetwork(() =>
      assertNoRepoWrites(repo, () =>
        withServer({ boardDir: boardDirPath, projectName, now: FIXED }, async (baseUrl) => {
          const res = await fetch(`${baseUrl}/api/board`);

          expect(res.status).toBe(200);

          const body = (await res.json()) as BoardBody;
          const ids = body.cards.map((c) => c.id);

          expect(ids).toEqual(['CARD-777']);
          expect(ids).not.toContain('CARD-001');
          expect(body.config.wipLimit).toBe(7);
          // --board-dir moves the board, never the project's name.
          expect(body.projectName).toBe(path.basename(repo));
        }),
      ),
    );
  });
});
