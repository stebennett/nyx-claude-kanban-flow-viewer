import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { load } from 'js-yaml';

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..');
const workflowPath = path.resolve(repoRoot, '.github/workflows/ci.yml');

interface Step {
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
}

interface Workflow {
  on?: {
    pull_request?: { branches?: string[] };
    workflow_call?: unknown;
  };
  permissions?: Record<string, string>;
  jobs?: Record<string, { 'runs-on'?: string; steps?: Step[] }>;
}

const rawText = readFileSync(workflowPath, 'utf-8');
const workflow = load(rawText) as Workflow;

describe('ci workflow contract', () => {
  it('triggers on pull_request targeting main and is callable via workflow_call', () => {
    expect(workflow.on?.pull_request?.branches).toStrictEqual(['main']);
    expect(workflow.on).toHaveProperty('workflow_call');
  });

  it('runs the four gates in order after npm ci, and only calls the typecheck script', () => {
    const steps = workflow.jobs?.['gates']?.steps ?? [];
    const runs = steps.map((step) => step.run).filter((run): run is string => Boolean(run));

    expect(runs).toContain('npm ci');
    expect(runs).toContain('npm run lint');
    expect(runs).toContain('npm run typecheck');
    expect(runs).toContain('npm test');
    expect(runs).toContain('npm run build');

    const ciIndex = runs.indexOf('npm ci');
    const lintIndex = runs.indexOf('npm run lint');
    const typecheckIndex = runs.indexOf('npm run typecheck');
    const testIndex = runs.indexOf('npm test');
    const buildIndex = runs.indexOf('npm run build');
    expect(ciIndex).toBeLessThan(lintIndex);
    expect(lintIndex).toBeLessThan(typecheckIndex);
    expect(typecheckIndex).toBeLessThan(testIndex);
    expect(testIndex).toBeLessThan(buildIndex);

    // ADR-0003: the typecheck gate must go through the npm script, never raw tsc.
    for (const run of runs) {
      expect(run).not.toContain('tsc --noEmit');
    }
  });

  it('never installs with npm install or npm i', () => {
    const steps = workflow.jobs?.['gates']?.steps ?? [];
    const runs = steps.map((step) => step.run).filter((run): run is string => Boolean(run));

    for (const run of runs) {
      const words = run.trim().split(/\s+/);
      expect(words).not.toEqual(['npm', 'install']);
      expect(words).not.toEqual(['npm', 'i']);
    }
  });

  it('uses setup-node with the npm cache on node 20', () => {
    const steps = workflow.jobs?.['gates']?.steps ?? [];
    const setupNode = steps.find((step) => step.uses?.startsWith('actions/setup-node'));

    expect(setupNode?.with?.['cache']).toBe('npm');
    expect(String(setupNode?.with?.['node-version'])).toBe('20');
  });

  it('caches no build state: no actions/cache step, no tsbuildinfo or dist cache path', () => {
    const steps = workflow.jobs?.['gates']?.steps ?? [];

    for (const step of steps) {
      expect(step.uses ?? '').not.toContain('actions/cache');
    }
    expect(rawText).not.toMatch(/tsbuildinfo/);
    expect(rawText).not.toMatch(/path:\s*dist/);
  });

  it('restricts permissions to read-only contents', () => {
    expect(workflow.permissions?.['contents']).toBe('read');
  });
});
