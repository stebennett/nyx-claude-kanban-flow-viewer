#!/usr/bin/env node
import { uiDistDir } from './paths.js';

// Placeholder entry point. CARD-005+ replaces this body with real CLI flag
// parsing, startup validation and the HTTP server. Referencing uiDistDir
// here keeps the pure path function reachable from the built bin without
// exercising any I/O yet.
void uiDistDir(import.meta.url);

process.stderr.write('usage: kanban-flow-viewer <path-to-repo>\n');
process.exitCode = 64;
