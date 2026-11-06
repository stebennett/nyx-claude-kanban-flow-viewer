import { afterEach, describe, expect, it } from 'vitest';
import { type ServerOptions } from './http-server.js';
import { buildSnapshot } from './build-snapshot.js';
import { assertNoRepoWrites, assertNoNonLoopbackNetwork } from '../../test/server-guard.js';
import { writeFixtureTree, cleanupFixtures, withServer } from '../../test/board-fixture.js';

const writeFixtureBoard = (files: Record<string, string>): string =>
  writeFixtureTree(files, 'http-server-');

afterEach(cleanupFixtures);

const VALID_CARD_1 = `---
id: CARD-001
title: First card
status: backlog
---

## Why
First card why.
`;

const VALID_CARD_2 = `---
id: CARD-002
title: Second card
status: backlog
---

## Why
Second card why.
`;

const FIXED = () => new Date('2026-07-20T12:00:00.000Z');

describe('createServer GET /api/board', () => {
  it('returns 200 with the buildSnapshot payload', async () => {
    const boardDir = writeFixtureBoard({
      'config.md': '---\nwip_limit: 2\n---\n',
      'CARD-001-first/card.md': VALID_CARD_1,
      'CARD-002-second/card.md': VALID_CARD_2,
    });

    const options: ServerOptions = { boardDir, projectName: 'fixture-project', now: FIXED };

    await withServer(options, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/board`);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8');

      const body = (await res.json()) as {
        projectName: string;
        cards: { id: string }[];
        config: { wipLimit: number };
      };

      expect(body).toEqual(buildSnapshot(options));

      // Independent, fixture-derived cross-checks — a hardcoded/empty payload
      // would fail these even if it happened to satisfy the deep-equal above.
      expect(body.projectName).toBe('fixture-project');
      expect(body.cards.map((c) => c.id)).toEqual(
        expect.arrayContaining(['CARD-001', 'CARD-002']),
      );
      expect(body.config.wipLimit).toBe(2);
    });
  });

  it('returns 200 for a query string on /api/board (dispatch is on pathname, not raw url)', async () => {
    const boardDir = writeFixtureBoard({
      'config.md': '---\nwip_limit: 2\n---\n',
      'CARD-001-first/card.md': VALID_CARD_1,
      'CARD-002-second/card.md': VALID_CARD_2,
    });

    const options: ServerOptions = { boardDir, projectName: 'fixture-project', now: FIXED };

    await withServer(options, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/board?x=1`);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8');

      const body = (await res.json()) as { projectName: string };
      expect(body).toEqual(buildSnapshot(options));
      expect(body.projectName).toBe('fixture-project');
    });
  });
});

describe('createServer unmatched routes', () => {
  it('GET /unknown returns 404 {error: "not found"}', async () => {
    const boardDir = writeFixtureBoard({ 'config.md': '---\nwip_limit: 2\n---\n' });
    const options: ServerOptions = { boardDir, projectName: 'p', now: FIXED };

    await withServer(options, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/unknown`);

      expect(res.status).toBe(404);
      expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8');
      expect(await res.json()).toEqual({ error: 'not found' });
    });
  });

  it('POST /api/board returns 404 {error: "not found"}', async () => {
    const boardDir = writeFixtureBoard({ 'config.md': '---\nwip_limit: 2\n---\n' });
    const options: ServerOptions = { boardDir, projectName: 'p', now: FIXED };

    await withServer(options, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/board`, { method: 'POST' });

      expect(res.status).toBe(404);
      expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8');
      expect(await res.json()).toEqual({ error: 'not found' });
    });
  });
});

describe('createServer 500 error contract', () => {
  it('a throwing snapshot provider yields 500 {error: "internal error"} with no message leak', async () => {
    const boardDir = writeFixtureBoard({ 'config.md': '---\nwip_limit: 2\n---\n' });
    const options: ServerOptions = {
      boardDir,
      projectName: 'p',
      snapshot: () => {
        throw new Error('boom');
      },
    };

    await withServer(options, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/board`);

      expect(res.status).toBe(500);
      expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8');

      const text = await res.text();
      expect(text).not.toContain('boom');
      expect(JSON.parse(text)).toEqual({ error: 'internal error' });
    });
  });
});

const MALFORMED_CARD = `---
id: CARD-999
title: "unterminated quote
---
`;

describe('createServer totality + REQ-001 guard', () => {
  it('a board with a malformed card still returns 200 with parseErrors', async () => {
    const boardDir = writeFixtureBoard({
      'config.md': '---\nwip_limit: 2\n---\n',
      'CARD-001-first/card.md': VALID_CARD_1,
      'CARD-XXX-bad/card.md': MALFORMED_CARD,
    });
    const options: ServerOptions = { boardDir, projectName: 'p', now: FIXED };

    await assertNoNonLoopbackNetwork(() =>
      assertNoRepoWrites(boardDir, () =>
        withServer(options, async (baseUrl) => {
          const res = await fetch(`${baseUrl}/api/board`);

          expect(res.status).toBe(200);

          const body = (await res.json()) as {
            cards: { id: string }[];
            parseErrors: { path: string; error: string }[];
          };

          expect(body.cards.map((c) => c.id)).toEqual(['CARD-001']);
          expect(body.parseErrors).toEqual([
            expect.objectContaining({ path: 'CARD-XXX-bad/card.md' }),
          ]);
          expect(body.parseErrors[0]?.path).not.toContain(boardDir);
        }),
      ),
    );
  });
});
