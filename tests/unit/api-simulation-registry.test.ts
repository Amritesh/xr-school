import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { buildApp } from '../../apps/api/src/app';

describe('simulation registry API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns all 36 canonical released modules with honest maturity', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/simulation-modules',
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.items).toHaveLength(36);
    expect(body.page).toMatchObject({
      pageSize: 36,
      totalItems: 36,
      totalPages: 1,
    });
    expect(
      body.items.every(
        (item: Record<string, string>) => item.publicationStatus === 'released',
      ),
    ).toBe(true);
    expect(
      body.items.every(
        (item: Record<string, string>) => item.evidenceMaturity === 'internalQA',
      ),
    ).toBe(true);
  });

  it('resolves a canonical slug and rejects an unknown module', async () => {
    const found = await app.inject({
      method: 'GET',
      url: '/v1/simulation-modules/c5-ch10-a01-a-visit-of-ancient-fort',
    });
    expect(found.statusCode).toBe(200);
    expect(found.json().viewerKey).toBeTruthy();
    const missing = await app.inject({
      method: 'GET',
      url: '/v1/simulation-modules/not-a-module',
    });
    expect(missing.statusCode).toBe(404);
  });
});
