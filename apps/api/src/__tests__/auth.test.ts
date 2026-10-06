import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { loadConfig } from '../config/env.js';
import { createAuthorize, createIntrospector, requireEntitlement } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { principal } from './fixtures.js';

afterEach(() => vi.useRealTimers());
const config = loadConfig({ NODE_ENV: 'test', AUTH_CACHE_TTL_SECONDS: 30 });
const session = (fetcher: typeof fetch) =>
  request(createApp({ config, fetcher }))
    .get('/api/v1/session')
    .auth('opaque-test-token', { type: 'bearer' });

describe('authoritative main authorization', () => {
  it('requires a bearer and maps core refusals without treating outages as logout', async () => {
    expect((await request(createApp()).get('/api/v1/session')).status).toBe(401);
    expect((await session(async () => new Response(null, { status: 401 }))).status).toBe(401);
    expect((await session(async () => new Response(null, { status: 403 }))).status).toBe(403);
    const outage = await session(async () => {
      throw new Error('network unavailable');
    });
    expect(outage.status).toBe(503);
    expect(outage.body.reason).toBe('main-unavailable');
  });
  it('rejects blocked accounts, malformed contracts and expired tokens', async () => {
    const blocked = { ...principal(), user: { ...principal().user, status: 'deactivated' } };
    expect((await session(async () => Response.json(blocked))).status).toBe(403);
    expect((await session(async () => Response.json({ user: { id: 'forged' } }))).status).toBe(503);
    const expired = principal();
    expired.tokenExpiresAt = expired.validUntil = new Date(Date.now() - 1000).toISOString();
    expect((await session(async () => Response.json(expired))).status).toBe(401);
  });
  it('caps cached authorization at validUntil and never uses stale entries on failure', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const value = principal();
    value.validUntil = new Date(Date.now() + 1000).toISOString();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(value))
      .mockRejectedValueOnce(new Error('core offline'));
    const introspect = createIntrospector(config, fetcher);
    expect((await introspect('token')).user.id).toBe(value.user.id);
    await introspect('token');
    expect(fetcher).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + 1001);
    await expect(introspect('token')).rejects.toMatchObject({ statusCode: 503 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('deduplicates simultaneous introspection and enforces only requested capabilities', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(principal()));
    const introspect = createIntrospector(config, fetcher);
    await Promise.all([introspect('same'), introspect('same')]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const app = express();
    app.use(createAuthorize(config, async () => Response.json(principal())));
    app.get('/test-capability', requireEntitlement('test-only'), (_req, res) =>
      res.json({ ok: true }),
    );
    app.use(errorHandler);
    const response = await request(app).get('/test-capability').auth('valid', { type: 'bearer' });
    expect(response.status).toBe(403);
    expect(response.body.reason).toBe('missing-entitlement');
  });
  it('aborts a stalled main request using the configured timeout', async () => {
    const fetcher: typeof fetch = async (_url, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => reject(new Error('aborted')), {
          once: true,
        });
      });
    const introspect = createIntrospector({ ...config, INTROSPECTION_TIMEOUT_MS: 20 }, fetcher);
    await expect(introspect('token')).rejects.toMatchObject({ statusCode: 503 });
  });
  it('refuses mock and loopback production configuration and clamps cache settings', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow('Production requires');
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        AUTH_MODE: 'main',
        MAIN_API_URL: 'https://localhost/api/v1',
      }),
    ).toThrow('Production requires');
    expect(() => loadConfig({ AUTH_CACHE_TTL_SECONDS: 31 })).toThrow();
    expect(
      loadConfig({
        NODE_ENV: 'production',
        AUTH_MODE: 'main',
        MAIN_API_URL: 'https://api.vetify.com/api/v1',
      }).AUTH_MODE,
    ).toBe('main');
  });
});
