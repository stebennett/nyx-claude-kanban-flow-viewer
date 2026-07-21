import type { AddressInfo } from 'node:net';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer, type ServerOptions } from '../src/server/http-server.js';

const tmpDirs: string[] = [];

/**
 * Writes `files` (relative path → contents) into a fresh tmp directory and
 * returns its absolute path. The directory is registered for `cleanupFixtures`.
 */
export function writeFixtureTree(files: Record<string, string>, prefix = 'kfv-fixture-'): string {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  tmpDirs.push(root);

  for (const [relPath, contents] of Object.entries(files)) {
    const fullPath = path.join(root, relPath);
    mkdirSync(path.dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, contents);
  }

  return root;
}

/** Removes every tmp tree created by `writeFixtureTree`. Call from `afterEach`. */
export function cleanupFixtures(): void {
  for (const dir of tmpDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Starts a `createServer(options)` server on an ephemeral `:0` port, hands the
 * caller its base URL, and always closes the server afterwards (even if `cb` throws).
 */
export async function withServer<T>(
  options: ServerOptions,
  cb: (baseUrl: string) => Promise<T> | T,
): Promise<T> {
  const server = createServer(options);

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;
    return await cb(baseUrl);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
