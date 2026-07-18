import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
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

  it('is an ESM package whose only runtime dependency is gray-matter (ADR-0005 amends ADR-0002)', () => {
    expect(pkg.type).toBe('module');
    expect(Object.keys(pkg.dependencies ?? {})).toEqual(['gray-matter']);
  });

  it('declares the four gate scripts CARD-002 will call', () => {
    // Literal command strings, not just key presence: ADR-0003 exists to prevent
    // `typecheck` silently reverting to plain `tsc --noEmit` (a false green that
    // checks zero files under the project-references layout).
    expect(pkg.scripts?.lint).toBe('eslint .');
    expect(pkg.scripts?.typecheck).toBe('tsc -b --noEmit');
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

  it('ships no test files in the published tarball', () => {
    execFileSync('npm', ['run', 'build'], { cwd: repoRoot, stdio: 'pipe' });
    const packJson = execFileSync('npm', ['pack', '--dry-run', '--json'], {
      cwd: repoRoot,
    }).toString('utf-8');
    const [tarball] = JSON.parse(packJson) as Array<{
      files: Array<{ path: string }>;
    }>;

    const testFiles = (tarball?.files ?? [])
      .map((f) => f.path)
      .filter((p) => /\.test\./.test(p));

    expect(testFiles).toEqual([]);
  }, 30000);
});
