import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { parseCard } from './parse-card.js';
import type { BoardConfig, BoardSnapshot, ParseError } from './card-model.js';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * gray-matter caches parses keyed by the exact input string, and populates that
 * cache BEFORE parsing — so a parse that goes on to throw still leaves a poisoned
 * (empty-data) cache entry for that string (KNOWLEDGE [CARD-021]). `clearCache` is
 * a real runtime export but is missing from gray-matter's bundled `.d.ts` (like
 * `matter.cache`, KNOWLEDGE [CARD-019] on why `@types/gray-matter` isn't added
 * instead), so it's accessed via a narrow local cast rather than `any`.
 */
function clearMatterCache(): void {
  (matter as unknown as { clearCache: () => void }).clearCache();
}

export const DEFAULT_WIP_LIMIT = 3;

export interface BuildSnapshotOptions {
  boardDir: string;
  projectName: string;
  now?: () => Date;
}

function asWipLimit(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : DEFAULT_WIP_LIMIT;
}

function readConfig(boardDir: string, parseErrors: ParseError[]): BoardConfig {
  let raw: string;
  try {
    raw = readFileSync(path.join(boardDir, 'config.md'), 'utf-8');
  } catch {
    return { wipLimit: DEFAULT_WIP_LIMIT };
  }

  try {
    clearMatterCache();
    const { data } = matter(raw);
    return { wipLimit: asWipLimit(data.wip_limit) };
  } catch (err) {
    parseErrors.push({ path: 'config.md', error: errorMessage(err) });
    return { wipLimit: DEFAULT_WIP_LIMIT };
  }
}

export function buildSnapshot(options: BuildSnapshotOptions): BoardSnapshot {
  const parseErrors: ParseError[] = [];
  const config = readConfig(options.boardDir, parseErrors);

  const dirNames = readdirSync(options.boardDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('CARD-'))
    .map((entry) => entry.name)
    .sort();

  const cards = [];
  for (const dirName of dirNames) {
    const cardDir = path.join(options.boardDir, dirName);
    try {
      const entries = readdirSync(cardDir);
      if (!entries.includes('card.md')) continue;
      const raw = readFileSync(path.join(cardDir, 'card.md'), 'utf-8');
      clearMatterCache();
      cards.push(parseCard(raw, { dirName, entries }));
    } catch (err) {
      parseErrors.push({ path: `${dirName}/card.md`, error: errorMessage(err) });
    }
  }

  const now = options.now ?? (() => new Date());

  return {
    generatedAt: now().toISOString(),
    projectName: options.projectName,
    config,
    cards,
    parseErrors,
  };
}
