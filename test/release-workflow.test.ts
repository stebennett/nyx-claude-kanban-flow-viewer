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

    // Pin the literal comparison direction: a presence-only check (does the run contain
    // 'exit 1' and the version lookup?) would still pass with an inverted operator
    // (`==` instead of `!=`), which would block every valid release AND publish on a
    // mismatched tag — the exact irreversible failure AC-2 exists to prevent.
    expect(guardStep?.run).toContain('"$GITHUB_REF_NAME" != "v${VERSION}"');
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

  it('installs with npm ci, builds, then publishes with provenance', () => {
    const { workflow } = loadWorkflow();
    const steps = workflow.jobs?.['publish']?.steps ?? [];
    const runs = steps.map((step) => step.run).filter((run): run is string => Boolean(run));

    expect(runs).toContain('npm ci');
    expect(runs).toContain('npm run build');

    const publishStep = steps.find((step) => step.run && /npm publish/.test(step.run));
    expect(publishStep?.run).toContain('--provenance');
  });

  it('publishes via npm Trusted Publishers (OIDC), not an NPM_TOKEN secret', () => {
    // https://docs.npmjs.com/trusted-publishers — trusted publishing authenticates the
    // publish step via the job's OIDC identity token, so no NODE_AUTH_TOKEN/NPM_TOKEN
    // secret should be wired in anywhere in the workflow.
    const { workflow, rawText } = loadWorkflow();
    const steps = workflow.jobs?.['publish']?.steps ?? [];
    const publishStep = steps.find((step) => step.run && /npm publish/.test(step.run));

    expect(publishStep?.env?.['NODE_AUTH_TOKEN']).toBeUndefined();
    expect(rawText).not.toContain('secrets.NPM_TOKEN');
  });

  it('upgrades npm to a version that supports trusted publishing before publishing', () => {
    // Trusted publishing requires npm CLI >= 11.5.1; Node 20's bundled npm (10.x) predates
    // that, so the workflow must upgrade the npm CLI itself (not a dependency install)
    // before the publish step runs.
    const { workflow } = loadWorkflow();
    const steps = workflow.jobs?.['publish']?.steps ?? [];

    const npmUpgradeIndex = steps.findIndex((step) =>
      /npm install -g npm@/.test(step.run ?? ''),
    );
    const publishIndex = steps.findIndex((step) => step.run && /npm publish/.test(step.run));

    expect(npmUpgradeIndex).toBeGreaterThanOrEqual(0);
    expect(publishIndex).toBeGreaterThan(npmUpgradeIndex);
  });

  it('orders the publish job steps: guard, then install, then build, then publish', () => {
    // Mirrors test/ci-workflow.test.ts:44-55's indexOf ordering pattern. Presence-only
    // assertions (above) would still pass if the steps were reordered — e.g. publish
    // running before build would ship a stale/missing dist/ permanently, and the guard
    // running after npm ci/build would waste the install/build before ever checking the
    // tag — so pin the relative order of the full step array explicitly.
    const { workflow } = loadWorkflow();
    const steps = workflow.jobs?.['publish']?.steps ?? [];

    const guardIndex = steps.findIndex(
      (step) =>
        step.run?.includes("require('./package.json').version") &&
        step.run?.includes('exit 1'),
    );
    const npmCiIndex = steps.findIndex((step) => step.run?.trim() === 'npm ci');
    const buildIndex = steps.findIndex((step) => step.run?.trim() === 'npm run build');
    const publishIndex = steps.findIndex((step) => step.run && /npm publish/.test(step.run));

    expect(guardIndex).toBeGreaterThanOrEqual(0);
    expect(npmCiIndex).toBeGreaterThanOrEqual(0);
    expect(buildIndex).toBeGreaterThanOrEqual(0);
    expect(publishIndex).toBeGreaterThanOrEqual(0);

    expect(guardIndex).toBeLessThan(npmCiIndex);
    expect(npmCiIndex).toBeLessThan(buildIndex);
    expect(buildIndex).toBeLessThan(publishIndex);
  });

  it('grants least-privilege publish permissions', () => {
    const { workflow } = loadWorkflow();

    expect(workflow.permissions?.['contents']).toBe('read');
    expect(workflow.jobs?.['publish']?.permissions).toStrictEqual({
      contents: 'write',
      'id-token': 'write',
    });
  });

  it('never installs with npm install', () => {
    const { workflow } = loadWorkflow();
    const steps = workflow.jobs?.['publish']?.steps ?? [];

    for (const step of steps) {
      if (!step.run) continue;
      const words = step.run.trim().split(/\s+/);
      expect(words).not.toEqual(['npm', 'install']);
      expect(words).not.toEqual(['npm', 'i']);
    }
  });

  it('creates a GitHub Release with generated notes', () => {
    const { workflow } = loadWorkflow();
    const steps = workflow.jobs?.['publish']?.steps ?? [];

    const releaseStep = steps.find(
      (step) => step.run?.includes('gh release create') && step.run?.includes('--generate-notes'),
    );

    expect(releaseStep).toBeDefined();
    expect(releaseStep?.env?.['GITHUB_TOKEN']).toBe('${{ secrets.GITHUB_TOKEN }}');

    // Presence-only checks above would still pass with a hardcoded/wrong tag argument
    // (e.g. `gh release create "v0.0.0-wrong" --generate-notes`) — AC-4 requires the
    // Release be created FOR THE PUSHED TAG, so pin that the release command itself
    // references it, not just that a release step with generated notes exists somewhere.
    const referencesPushedTag =
      releaseStep?.run?.includes('$GITHUB_REF_NAME') ||
      releaseStep?.run?.includes('github.ref_name');
    expect(referencesPushedTag).toBe(true);
  });

  it('has no gate-bypassing escape hatches', () => {
    const { workflow } = loadWorkflow();

    for (const job of Object.values(workflow.jobs ?? {})) {
      for (const step of job.steps ?? []) {
        expect(step['continue-on-error']).not.toBe(true);
      }
    }
    expect(workflow.jobs?.['gates']?.if).toBeUndefined();
    for (const step of workflow.jobs?.['publish']?.steps ?? []) {
      expect(step.if).toBeUndefined();
    }
  });
});
