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
