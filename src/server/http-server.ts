import { createServer as createHttpServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { buildSnapshot } from './build-snapshot.js';
import type { BoardSnapshot } from './card-model.js';

export interface ServerOptions {
  boardDir: string;
  projectName: string;
  now?: () => Date; // passthrough to buildSnapshot; deterministic tests only
  snapshot?: () => BoardSnapshot;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(payload);
}

function handleRequest(options: ServerOptions, req: IncomingMessage, res: ServerResponse): void {
  const snapshot = options.snapshot ?? (() => buildSnapshot(options));
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;

  if (req.method === 'GET' && pathname === '/api/board') {
    try {
      sendJson(res, 200, snapshot());
    } catch {
      // Never leak the thrown error's message to the client.
      sendJson(res, 500, { error: 'internal error' });
    }
    return;
  }

  sendJson(res, 404, { error: 'not found' });
}

/**
 * Returns an unlistened `node:http` server (ADR-0010): the caller picks the
 * port (`index.ts` binds 4400; tests bind `:0`). Dispatch is manual on
 * `(method, pathname)`; `GET /api/board` serializes `options.snapshot`
 * (defaulting to `buildSnapshot(options)`), anything else is a 404.
 */
export function createServer(options: ServerOptions): Server {
  return createHttpServer((req, res) => {
    handleRequest(options, req, res);
  });
}
