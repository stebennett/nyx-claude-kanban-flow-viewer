import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { load } from 'js-yaml';

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..');
const workflowPath = path.resolve(repoRoot, '.github/workflows/release.yml');

function readJson(relativePath: string): Record<string, unknown> {
  const raw = readFileSync(path.resolve(repoRoot, relativePath), 'utf-8');
  return JSON.parse(raw) as Record<string, unknown>;
}

interface Step {
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
  env?: Record<string, unknown>;
  if?: string;
  'continue-on-error'?: boolean;
}

interface Job {
  uses?: string;
  needs?: string | string[];
  'runs-on'?: string;
  permissions?: Record<string, string>;
  if?: string;
  steps?: Step[];
}

interface Workflow {
  on?: {
    push?: { tags?: string[]; branches?: string[] };
    pull_request?: unknown;
  };
  permissions?: Record<string, string>;
  jobs?: Record<string, Job>;
}

function loadWorkflow(): { workflow: Workflow; rawText: string } {
  const rawText = readFileSync(workflowPath, 'utf-8');
  const workflow = load(rawText) as Workflow;
  return { workflow, rawText };
}

describe('release contract', () => {
  it('declares a repository.url so npm provenance can link source', () => {
    const pkg = readJson('package.json') as { repository?: { url?: string } };

    expect(String(pkg.repository?.url)).toContain('github.com');
    expect(String(pkg.repository?.url)).toContain('nyx-claude-flow-viewer');
  });

  it('triggers only on vX.Y.Z tags', () => {
    const { workflow } = loadWorkflow();

    expect(workflow.on?.push?.tags).toStrictEqual(['v[0-9]+.[0-9]+.[0-9]+']);
    expect(workflow.on?.push?.branches).toBeUndefined();
    expect(workflow.on).not.toHaveProperty('pull_request');
  });

  it('reuses the CI gates', () => {
    const { workflow } = loadWorkflow();

    expect(workflow.jobs?.['gates']?.uses).toBe('./.github/workflows/ci.yml');
  });

  it('gates precede publish', () => {
    const { workflow } = loadWorkflow();

    expect(workflow.jobs?.['publish']?.needs).toContain('gates');
  });

  it('guards tag against package.json version', () => {
    const { workflow } = loadWorkflow();
    const steps = workflow.jobs?.['publish']?.steps ?? [];

    const guardStep = steps.find(
      (step) =>
        step.run?.includes("require('./package.json').version") &&
        step.run?.includes('exit 1'),
    );

    expect(guardStep).toBeDefined();
    const referencesRefName =
      guardStep?.run?.includes('GITHUB_REF_NAME') ||
      guardStep?.run?.includes('github.ref_name') ||
      Object.values(guardStep?.env ?? {}).some((value) =>
        String(value).includes('github.ref_name'),
      );
    expect(referencesRefName).toBe(true);
  });

  it('SHA-pins every third-party action with a version comment', () => {
    const { workflow, rawText } = loadWorkflow();
    const lines = rawText.split('\n');

    for (const job of Object.values(workflow.jobs ?? {})) {
      for (const step of job.steps ?? []) {
        if (!step.uses || step.uses.startsWith('./')) continue;

        expect(step.uses).toMatch(/^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/);

        const rawLine = lines.find((line) => line.includes(step.uses as string));
        expect(rawLine).toMatch(/#\s*\S+/);
      }
    }
  });

  it('sets up node 20 with the npm registry for auth', () => {
    const { workflow } = loadWorkflow();
    const steps = workflow.jobs?.['publish']?.steps ?? [];
    const setupNode = steps.find((step) => step.uses?.startsWith('actions/setup-node'));

    expect(setupNode?.with?.['registry-url']).toBe('https://registry.npmjs.org');
    expect(String(setupNode?.with?.['node-version'])).toBe('20');
  });
});
