import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..');

function readJson(relativePath: string): Record<string, unknown> {
  const raw = readFileSync(path.resolve(repoRoot, relativePath), 'utf-8');
  return JSON.parse(raw) as Record<string, unknown>;
}

describe('release contract', () => {
  it('declares a repository.url so npm provenance can link source', () => {
    const pkg = readJson('package.json') as { repository?: { url?: string } };

    expect(String(pkg.repository?.url)).toContain('github.com');
    expect(String(pkg.repository?.url)).toContain('nyx-claude-flow-viewer');
  });
});
