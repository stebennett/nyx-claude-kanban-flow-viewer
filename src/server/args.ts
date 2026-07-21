/**
 * CLI argument parsing for `kanban-flow-viewer` (ADR-0012).
 *
 * Pure by construction: no fs, no `process`, no throw. `index.ts` — the
 * coverage-excluded I/O edge — owns argv, stderr and the exit code; everything
 * decidable from the tokens alone lives here so it can be unit-tested.
 */

/** REQ-012: the board location is repo-relative and defaults to `docs/cards`. */
export const DEFAULT_BOARD_DIR = 'docs/cards';

/** Mirrors REQ-010's usage line, narrowed to the flags that exist today. */
export const USAGE = 'usage: kanban-flow-viewer <path-to-repo> [--board-dir docs/cards]';

/** sysexits(3) EX_USAGE — the exit code `index.ts` sets on a parse failure. */
export const EXIT_USAGE = 64;

export interface CliArgs {
  /** The positional `<path-to-repo>`, exactly as typed. */
  targetRepo: string;
  /** Repo-RELATIVE board dir; `DEFAULT_BOARD_DIR` when `--board-dir` was absent. */
  boardDir: string;
}

export type ParsedArgs = { ok: true; args: CliArgs } | { ok: false; error: string };

const BOARD_DIR_FLAG = '--board-dir';

/**
 * Parses the USER argv (`process.argv.slice(2)`). Total: never throws — every
 * failure is `{ok:false, error}` with a project-owned message.
 *
 * One left-to-right walk over the token VALUES (`for…of`, never `argv[i]`):
 * under `noUncheckedIndexedAccess` an indexed read is `string | undefined`, and
 * the reflexive `?? ''` guard would be an unreachable branch charged against the
 * 90% branch threshold (KNOWLEDGE [CARD-019], [CARD-006]). A pending flag is
 * carried in `awaitingValueFor` instead of by look-ahead.
 */
export function parseArgs(argv: string[]): ParsedArgs {
  let targetRepo: string | undefined;
  let boardDir = DEFAULT_BOARD_DIR;
  let awaitingValueFor: string | undefined;

  for (const token of argv) {
    if (awaitingValueFor !== undefined) {
      // A `--`-prefixed token is the next OPTION, not this flag's value.
      if (token.startsWith('--')) {
        return { ok: false, error: `${awaitingValueFor} requires a value` };
      }
      if (token === '') {
        return { ok: false, error: `${awaitingValueFor} requires a non-empty value` };
      }
      boardDir = token; // repeated --board-dir: last wins
      awaitingValueFor = undefined;
      continue;
    }

    if (token === BOARD_DIR_FLAG) {
      awaitingValueFor = token;
      continue;
    }

    if (token.startsWith('--')) {
      // Strict by design (ADR-0012): an unimplemented sibling flag fails loudly
      // rather than being silently ignored. CARD-025/026 add their own cases.
      return { ok: false, error: `unknown option: ${token}` };
    }

    if (targetRepo !== undefined) {
      return { ok: false, error: `unexpected argument: ${token}` };
    }

    targetRepo = token;
  }

  if (awaitingValueFor !== undefined) {
    return { ok: false, error: `${awaitingValueFor} requires a value` };
  }

  if (targetRepo === undefined) {
    return { ok: false, error: 'missing <path-to-repo>' };
  }

  return { ok: true, args: { targetRepo, boardDir } };
}
