import request from 'supertest';
import { expect, it } from 'vitest';
import { createApp } from '../app.js';
import { principal, testConfig } from './fixtures.js';
import { loadConfig } from '../config/env.js';

const session = (value: unknown) =>
  request(createApp({ config: testConfig, fetcher: async () => Response.json(value) }))
    .get('/api/v1/session')
    .auth('token', { type: 'bearer' });

it('rejects old contracts, wrong issuer/audience and missing verification assertions', async () => {
  expect((await session({ ...principal(), version: 1 })).status).toBe(503);
  expect((await session({ ...principal(), issuer: 'https://attacker.test' })).status).toBe(401);
  expect((await session({ ...principal(), audience: 'other-app' })).status).toBe(503);
  const value = principal();
  const { emailVerified: _verified, ...user } = value.user;
  expect((await session({ ...value, user })).status).toBe(503);
});
it('blocks unverified local accounts and preserves a verified professional role', async () => {
  const value = principal('canonical-shared-id');
  value.user.emailVerified = false;
  const refusal = await session(value);
  expect(refusal.status).toBe(403);
  expect(refusal.body.reason).toBe('email-verification-required');
  value.user.emailVerified = true;
  value.user.role = 'professional';
  const allowed = await session(value);
  expect(allowed.status).toBe(200);
  expect(allowed.body.user).toMatchObject({ id: 'canonical-shared-id', role: 'professional' });
  expect(allowed.body.entitlements).toEqual([]);
});
it('keeps verification refusals distinct from blocked accounts and service outages', async () => {
  const app = createApp({
    config: testConfig,
    fetcher: async () => Response.json({ reason: 'email-verification-required' }, { status: 403 }),
  });
  const refusal = await request(app).get('/api/v1/session').auth('token', { type: 'bearer' });
  expect(refusal.body.reason).toBe('email-verification-required');
});
it('requires an explicitly agreed issuer for real main authentication', () => {
  expect(() =>
    loadConfig({ AUTH_MODE: 'main', MAIN_API_URL: 'https://api.vetify.test/api/v1' }),
  ).toThrow('MAIN_TOKEN_ISSUER');
});
