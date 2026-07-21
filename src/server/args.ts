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

/** Parses the USER argv (`process.argv.slice(2)`). Total: never throws. */
export function parseArgs(argv: string[]): ParsedArgs {
  const [targetRepo] = argv;

  if (targetRepo === undefined) {
    return { ok: false, error: 'missing <path-to-repo>' };
  }

  return { ok: true, args: { targetRepo, boardDir: DEFAULT_BOARD_DIR } };
}
