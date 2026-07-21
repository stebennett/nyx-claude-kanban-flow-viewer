#!/usr/bin/env node
import { basename, resolve } from 'node:path';
import { createServer } from './http-server.js';

const PORT = 4400;

// CLI entry point. Deliberately does no flag parsing (--port/--board-dir/
// --no-open), port default semantics, or auto-increment — that's CARD-018.
// This is the I/O edge (coverage-excluded per [CARD-001]); proven by
// npm run build:server + tsc -b --noEmit and a manual smoke, not a unit test.
const targetRepo = process.argv[2];

if (targetRepo === undefined) {
  process.stderr.write('usage: kanban-flow-viewer <path-to-repo>\n');
  process.exitCode = 64;
} else {
  const boardDir = resolve(targetRepo, 'docs/cards');
  const projectName = basename(resolve(targetRepo));

  createServer({ boardDir, projectName }).listen(PORT, '127.0.0.1', () => {
    process.stdout.write(`kanban-flow-viewer serving ${projectName} at http://localhost:${PORT}\n`);
  });
}
