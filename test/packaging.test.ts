import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { uiDistDir } from '../src/server/paths.js';

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..');

function readJson(relativePath: string): Record<string, unknown> {
  const raw = readFileSync(path.resolve(repoRoot, relativePath), 'utf-8');
  return JSON.parse(raw) as Record<string, unknown>;
}

describe('packaging contract', () => {
  const pkg = readJson('package.json') as {
    bin?: Record<string, string>;
    files?: string[];
    type?: string;
    dependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };

  it('declares the kanban-flow-viewer bin at dist/server/index.js', () => {
    expect(pkg.bin).toStrictEqual({ 'kanban-flow-viewer': 'dist/server/index.js' });
  });

  it('includes dist in the published files list', () => {
    expect(pkg.files).toContain('dist');
  });

  it('is an ESM package with no runtime dependencies', () => {
    expect(pkg.type).toBe('module');
    expect(pkg.dependencies === undefined || Object.keys(pkg.dependencies).length === 0).toBe(true);
  });

  it('declares the four gate scripts CARD-002 will call', () => {
    expect(pkg.scripts).toHaveProperty('lint');
    expect(pkg.scripts).toHaveProperty('typecheck');
    expect(pkg.scripts).toHaveProperty('test');
    expect(pkg.scripts).toHaveProperty('build');
  });

  it('matches Vite and tsc outDir to the documented build layout', async () => {
    const viteConfigModule = (await import('../vite.config.js')) as {
      default: { build?: { outDir?: string } };
    };
    const viteConfig = viteConfigModule.default;
    const tsconfigServer = readJson('tsconfig.server.json') as {
      compilerOptions?: { outDir?: string };
    };

    expect(viteConfig.build?.outDir).toBe('dist/ui');
    expect(tsconfigServer.compilerOptions?.outDir).toBe('dist/server');
  });

  it('pins bin, tsc outDir, Vite outDir and uiDistDir to the same layout', async () => {
    const viteConfigModule = (await import('../vite.config.js')) as {
      default: { build?: { outDir?: string } };
    };
    const viteConfig = viteConfigModule.default;

    const binPath = pkg.bin?.['kanban-flow-viewer'];
    expect(binPath).toBeDefined();

    const binUrl = pathToFileURL(path.resolve(repoRoot, binPath as string)).href;
    const resolvedFromBin = uiDistDir(binUrl);
    const resolvedFromVite = path.resolve(repoRoot, viteConfig.build?.outDir as string);

    expect(resolvedFromBin).toBe(resolvedFromVite);
  });
});
