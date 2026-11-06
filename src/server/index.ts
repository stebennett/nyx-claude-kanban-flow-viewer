#!/usr/bin/env node
import { EXIT_USAGE, USAGE, parseArgs, resolvePaths } from './args.js';
import { createServer } from './http-server.js';

const PORT = 4400;

// CLI entry point: pure wiring over the pure `args.ts` module (ADR-0012).
// `--board-dir` (REQ-012) is handled here now. Startup validation of the
// resolved dir (REQ-014) is CARD-024; `--port` + auto-increment (REQ-011) is
// CARD-025; `--no-open` and the browser launch (REQ-013) is CARD-026 — those
// flags deliberately exit 64 as unknown options until their card lands.
// This is the I/O edge (coverage-excluded per [CARD-001]); proven by
// npm run build:server + tsc -b --noEmit and a manual smoke, not a unit test.
const parsed = parseArgs(process.argv.slice(2));

if (!parsed.ok) {
  process.stderr.write(`${parsed.error}\n${USAGE}\n`);
  process.exitCode = EXIT_USAGE;
} else {
  const { boardDirPath, projectName } = resolvePaths(parsed.args);

  createServer({ boardDir: boardDirPath, projectName }).listen(PORT, '127.0.0.1', () => {
    process.stdout.write(`kanban-flow-viewer serving ${projectName} at http://localhost:${PORT}\n`);
  });
}
