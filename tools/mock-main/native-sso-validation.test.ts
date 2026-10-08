import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createMockMain } from './app';
import { handoffBody, exchangeBody, signedInMain } from './native-sso.fixtures';

describe('native handoff validation', () => {
  it.each([
    { clientId: 'another-app' },
    { redirectUri: 'https://evil.test/callback' },
    { redirectUri: 'vetify-planner://auth/callback/extra' },
    { redirectUri: 'vetify-planner://auth/callback?redirect=evil' },
    { redirectUri: 'vetify-planner://auth/callback#token' },
    { userId: '000000000000000000000002' },
    { unknown: 'extra' },
  ])('refuses invalid handoff requests and caller-selected identities: %j', async (invalid) => {
    const { browser } = await signedInMain();
    const response = await browser
      .post('/api/v1/auth/native/handoff')
      .send({ ...handoffBody, ...invalid })
      .expect(400);
    expect(response.body.url).toBeUndefined();
  });

  it.each([
    { clientId: 'another-app' },
    { redirectUri: 'vetify-planner://other/callback' },
    { code: '' },
    { code: 'x'.repeat(129) },
    { userId: '000000000000000000000002' },
  ])('rejects exchanges with invalid client, return URI or grant: %j', async (invalid) => {
    const { app, issueCode } = await signedInMain();
    await request(app)
      .post('/api/v1/auth/native/exchange')
      .send({ ...exchangeBody(await issueCode()), ...invalid })
      .expect(400);
  });

  it('rejects a fabricated authorization code', async () => {
    await request(createMockMain())
      .post('/api/v1/auth/native/exchange')
      .send(exchangeBody('z'.repeat(43)))
      .expect(401);
  });

  it('cannot issue an account QR using a forged browser cookie', async () => {
    await request(createMockMain())
      .post('/api/v1/auth/native/handoff')
      .set('Cookie', 'vetify_planner_demo_refresh=forged-session')
      .send(handoffBody)
      .expect(401);
  });
});
