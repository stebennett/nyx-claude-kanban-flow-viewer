import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';

/**
 * Shared REQ-001 guard, reused by every server-level test (CARD-006/007/008/018).
 * See ADR-0011.
 */

function listFilesRelative(dir: string): string[] {
  const results: string[] = [];

  function walk(current: string): void {
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        results.push(path.relative(dir, fullPath).split(path.sep).join('/'));
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * A deterministic digest of a directory tree: sorted board-relative paths, each
 * paired with a sha256 hash of its contents, joined into one string. Two calls
 * over the same unchanged tree produce identical digests; any add/modify/remove
 * changes the digest.
 */
export function digestTree(dir: string): string {
  const relPaths = listFilesRelative(dir).sort();

  return relPaths
    .map((relPath) => {
      const contents = readFileSync(path.join(dir, relPath));
      const hash = createHash('sha256').update(contents).digest('hex');
      return `${relPath}:${hash}`;
    })
    .join('\n');
}

/**
 * Asserts that `body` makes no change to `dir`'s file tree (REQ-001). Digests
 * `dir` before and after invoking `body`; throws if they differ. Returns
 * `body`'s resolved value on success.
 */
export async function assertNoRepoWrites<T>(dir: string, body: () => Promise<T> | T): Promise<T> {
  const before = digestTree(dir);
  const result = await body();
  const after = digestTree(dir);

  if (before !== after) {
    throw new Error(`assertNoRepoWrites: repo tree changed under ${dir}`);
  }

  return result;
}

const LOOPBACK_HOSTS = new Set(['', 'localhost', '127.0.0.1', '::1', '::ffff:127.0.0.1']);

function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(host);
}

type ConnectArg = number | string | { host?: string; hostname?: string; path?: string };

/**
 * `net.connect(...)`/`net.createConnection(...)` (the factory functions undici's
 * `fetch` and `net.connect` callers both go through) pre-normalize their arguments
 * and invoke `Socket.prototype.connect` with a SINGLE array argument — the
 * `[options, callback]` pair — rather than spreading them. A direct
 * `socket.connect(port, host)`/`socket.connect(options)` call is not wrapped this
 * way. Detect and unwrap the single-array-argument form before reading the target.
 */
function unwrapConnectArgs(args: unknown[]): unknown[] {
  if (args.length === 1 && Array.isArray(args[0])) {
    return args[0] as unknown[];
  }
  return args;
}

/**
 * Classifies a `Socket.prototype.connect` call's target for REQ-001 purposes.
 * `'allow'` covers the documented host-less defaults (a bare port, an IPC
 * path). `'host'` carries a resolved host/hostname/IPC path to check against
 * the loopback allowlist. `'unrecognized'` is a fail-closed catch-all — an
 * options object with none of `host`/`hostname`/`path` (or any other shape)
 * is treated as NON-loopback rather than silently allowed: this is a security
 * guard, not a best-effort default, and every real caller (fetch, https, our
 * own tests) always sets an explicit host/hostname/path.
 */
type ConnectTarget = { kind: 'allow' } | { kind: 'host'; host: string } | { kind: 'unrecognized' };

function classifyConnectArgs(rawArgs: unknown[]): ConnectTarget {
  const args = unwrapConnectArgs(rawArgs);
  const [first, second] = args as [ConnectArg | undefined, unknown];

  if (typeof first === 'number') {
    // (port, host?, ...) — an explicit host in arg 2, or the documented
    // localhost default when omitted.
    return typeof second === 'string' ? { kind: 'host', host: second } : { kind: 'allow' };
  }

  if (typeof first === 'string') {
    // An IPC path (unix socket) — always allowed, not a network host at all.
    return { kind: 'allow' };
  }

  if (first && typeof first === 'object') {
    const host = first.host ?? first.hostname ?? first.path;
    return host !== undefined ? { kind: 'host', host } : { kind: 'unrecognized' };
  }

  return { kind: 'unrecognized' };
}

function isBlocked(target: ConnectTarget): boolean {
  if (target.kind === 'allow') {
    return false;
  }
  if (target.kind === 'unrecognized') {
    return true;
  }
  return !isLoopbackHost(target.host);
}

function describeTarget(target: ConnectTarget): string {
  return target.kind === 'host' ? target.host : 'an unrecognized connect() argument shape';
}

/**
 * Asserts that `body` makes no outbound network connection to a non-loopback
 * host (REQ-001) for its duration. Spies `net.Socket.prototype.connect`
 * (which undici's global `fetch` also routes through) and throws synchronously
 * from the patched `connect` on a non-loopback (or unrecognized) target.
 * Always restores the original `connect` in `finally`. Returns `body`'s
 * resolved value on success.
 */
export async function assertNoNonLoopbackNetwork<T>(body: () => Promise<T> | T): Promise<T> {
  const original = net.Socket.prototype.connect;

  net.Socket.prototype.connect = function patchedConnect(this: net.Socket, ...args: unknown[]) {
    const target = classifyConnectArgs(args);
    if (isBlocked(target)) {
      throw new Error(`assertNoNonLoopbackNetwork: blocked connection to ${describeTarget(target)}`);
    }
    return original.apply(this, args as Parameters<typeof original>);
  } as typeof net.Socket.prototype.connect;

  try {
    return await body();
  } finally {
    net.Socket.prototype.connect = original;
  }
}
