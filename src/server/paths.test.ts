import { describe, expect, it } from 'vitest';
import { pathToFileURL } from 'node:url';
import { uiDistDir } from './paths.js';

describe('uiDistDir', () => {
  it('resolves the sibling dist/ui directory for a module directly in dist/server', () => {
    expect(uiDistDir('file:///a/b/dist/server/index.js')).toBe('/a/b/dist/ui');
  });

  it('documents the precondition: a module nested under dist/server does not generalise', () => {
    // The contract is "a module directly in dist/server" — a nested module like
    // dist/server/http/serve.js resolves relative to *its own* directory, not the
    // package's dist/server root. This is the documented limitation, asserted
    // explicitly rather than pretended away.
    expect(uiDistDir('file:///a/b/dist/server/http/serve.js')).toBe('/a/b/dist/server/ui');
  });

  it('percent-decodes the resolved path', () => {
    expect(uiDistDir('file:///a/b%20c/dist/server/index.js')).toBe('/a/b c/dist/ui');
  });

  it('throws a TypeError for a non-file URL', () => {
    expect(() => uiDistDir('https://example.com/x.js')).toThrow(TypeError);
  });

  it('resolves a realistic self-location to a sibling ui directory', () => {
    const href = pathToFileURL('/repo/dist/server/index.js').href;
    const result = uiDistDir(href);
    expect(result.endsWith('/dist/ui')).toBe(true);
    expect(result.includes('/server/')).toBe(false);
  });
});
