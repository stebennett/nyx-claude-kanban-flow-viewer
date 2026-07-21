import { describe, expect, it } from 'vitest';
import { DEFAULT_BOARD_DIR, EXIT_USAGE, USAGE, parseArgs } from './args.js';

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
