import { afterEach, describe, expect, it } from 'vitest';
import { createServer as createHttpServer, type Server as HttpServer } from 'node:http';
import net from 'node:net';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { digestTree, assertNoRepoWrites, assertNoNonLoopbackNetwork } from './server-guard.js';

const tmpDirs: string[] = [];

function writeFixtureDir(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'server-guard-'));
  tmpDirs.push(dir);
  for (const [relPath, contents] of Object.entries(files)) {
    const fullPath = path.join(dir, relPath);
    mkdirSync(path.dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, contents);
  }
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('digestTree', () => {
  it('changes when a file is added', () => {
    const dir = writeFixtureDir({ 'a.txt': 'hello' });
    const before = digestTree(dir);
    writeFileSync(path.join(dir, 'b.txt'), 'world');
    const after = digestTree(dir);
    expect(after).not.toBe(before);
  });

  it('changes when a file is modified', () => {
    const dir = writeFixtureDir({ 'a.txt': 'hello' });
    const before = digestTree(dir);
    writeFileSync(path.join(dir, 'a.txt'), 'goodbye');
    const after = digestTree(dir);
    expect(after).not.toBe(before);
  });

  it('changes when a file is removed', () => {
    const dir = writeFixtureDir({ 'a.txt': 'hello', 'b.txt': 'world' });
    const before = digestTree(dir);
    unlinkSync(path.join(dir, 'b.txt'));
    const after = digestTree(dir);
    expect(after).not.toBe(before);
  });

  it('is identical for an unchanged tree', () => {
    const dir = writeFixtureDir({ 'a.txt': 'hello', 'nested/b.txt': 'world' });
    expect(digestTree(dir)).toBe(digestTree(dir));
  });
});

describe('assertNoRepoWrites', () => {
  it('throws when body writes a file', async () => {
    const dir = writeFixtureDir({ 'a.txt': 'hello' });

    await expect(
      assertNoRepoWrites(dir, () => {
        writeFileSync(path.join(dir, 'a.txt'), 'mutated');
      }),
    ).rejects.toThrow();
  });

  it("returns body's value when the tree is untouched", async () => {
    const dir = writeFixtureDir({ 'a.txt': 'hello' });

    const result = await assertNoRepoWrites(dir, () => 42);

    expect(result).toBe(42);
  });
});

describe('assertNoNonLoopbackNetwork', () => {
  it('throws when body connects to a non-loopback host', async () => {
    await expect(
      assertNoNonLoopbackNetwork(() => {
        const socket = net.connect(80, '93.184.216.34');
        socket.destroy();
      }),
    ).rejects.toThrow();
  });

  it('allows a loopback connect', async () => {
    const echoServer: HttpServer = createHttpServer((_req, res) => {
      res.end('ok');
    });

    await new Promise<void>((resolve) => echoServer.listen(0, '127.0.0.1', resolve));

    try {
      const address = echoServer.address();
      if (address === null || typeof address === 'string') {
        throw new Error('expected an AddressInfo');
      }
      const port = address.port;

      const result = await assertNoNonLoopbackNetwork(async () => {
        const res = await fetch(`http://127.0.0.1:${port}/`);
        return res.status;
      });

      expect(result).toBe(200);
    } finally {
      await new Promise<void>((resolve) => echoServer.close(() => resolve()));
    }
  });

  it('restores net.Socket.prototype.connect after the body completes', async () => {
    const original = net.Socket.prototype.connect;

    await assertNoNonLoopbackNetwork(() => undefined);

    expect(net.Socket.prototype.connect).toBe(original);
  });

  it('restores net.Socket.prototype.connect after the body throws', async () => {
    const original = net.Socket.prototype.connect;

    await expect(
      assertNoNonLoopbackNetwork(() => {
        throw new Error('body failure');
      }),
    ).rejects.toThrow('body failure');

    expect(net.Socket.prototype.connect).toBe(original);
  });

  it('blocks a direct socket.connect(port, host) call (the number + string-host shape)', async () => {
    // Unlike the net.connect(...)/fetch() factory paths (which pre-normalize
    // into a single array argument before Socket.prototype.connect sees them),
    // a direct socket.connect(port, host) call reaches the spy with the raw
    // (number, string) pair — the branch this test targets.
    await expect(
      assertNoNonLoopbackNetwork(() => {
        const socket = new net.Socket();
        socket.connect(80, '93.184.216.34');
      }),
    ).rejects.toThrow();
  });

  it('blocks fetch() to a non-loopback host', async () => {
    // Proves the guard blocks the realistic GitHub-call threat, not just raw
    // net.connect: the spy throws synchronously at connect, so no real
    // network reaches out.
    await expect(assertNoNonLoopbackNetwork(() => fetch('http://93.184.216.34/'))).rejects.toThrow();
  });

  it('fails closed on a connect() options object with no host, hostname, or path', async () => {
    await expect(
      assertNoNonLoopbackNetwork(() => {
        const socket = new net.Socket();
        socket.connect({ port: 80 });
      }),
    ).rejects.toThrow();
  });

  it('reads .hostname (not only .host/.path) and blocks a non-loopback hostname-only object', async () => {
    await expect(
      assertNoNonLoopbackNetwork(() => {
        const socket = new net.Socket();
        socket.connect({ hostname: '93.184.216.34', port: 80 } as unknown as net.SocketConnectOpts);
      }),
    ).rejects.toThrow();
  });

  it('reads .hostname (not only .host/.path) and allows a loopback hostname-only object', async () => {
    const echoServer: HttpServer = createHttpServer((_req, res) => {
      res.end('ok');
    });

    await new Promise<void>((resolve) => echoServer.listen(0, '127.0.0.1', resolve));

    try {
      const address = echoServer.address();
      if (address === null || typeof address === 'string') {
        throw new Error('expected an AddressInfo');
      }
      const port = address.port;

      await assertNoNonLoopbackNetwork(
        () =>
          new Promise<void>((resolve, reject) => {
            const socket = new net.Socket();
            socket.once('error', reject);
            socket.once('connect', () => {
              socket.destroy();
              resolve();
            });
            socket.connect({ hostname: '127.0.0.1', port } as unknown as net.SocketConnectOpts);
          }),
      );
    } finally {
      await new Promise<void>((resolve) => echoServer.close(() => resolve()));
    }
  });

  it('blocks a direct connect() to a non-loopback IPv6 host', async () => {
    await expect(
      assertNoNonLoopbackNetwork(() => {
        const socket = new net.Socket();
        socket.connect(80, '2001:4860:4860::8888');
      }),
    ).rejects.toThrow();
  });

  it('allows a direct connect() to the IPv6 loopback host (::1)', async () => {
    await assertNoNonLoopbackNetwork(
      () =>
        new Promise<void>((resolve) => {
          const socket = new net.Socket();
          socket.once('error', () => resolve());
          socket.once('connect', () => {
            socket.destroy();
            resolve();
          });
          socket.connect(80, '::1');
        }),
    );
  });
});
