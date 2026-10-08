import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createMockMain } from './app';
import { authorization, exchangeBody, signedInMain } from './native-sso.fixtures';

describe('native handoff validation', () => {
  it.each([
    { client_id: 'another-app' },
    { redirect_uri: 'https://evil.test/callback' },
    { redirect_uri: 'vetify-planner://auth/callback/extra' },
    { redirect_uri: 'vetify-planner://auth/callback?redirect=evil' },
    { response_type: 'token' },
    { state: '' },
    { state: 'too-short' },
    { state: 'x'.repeat(129) },
    { state: 'bad\r\nstate-value-1234' },
    { state: [authorization.state, 'another-device-state'] },
    { code_challenge_method: 'plain' },
    { code_challenge: 'too-short' },
    { code_challenge: '+'.repeat(43) },
    { unknown: 'extra' },
  ])('refuses malformed authorization without redirecting: %j', async (invalid) => {
    const response = await request(createMockMain())
      .get('/api/v1/auth/native/authorize')
      .query({ ...authorization, ...invalid })
      .expect(400);
    expect(response.headers.location).toBeUndefined();
  });

  it('requires proof from the same app that requested authorization', async () => {
    const { app, issueCode, exchange } = await signedInMain();
    const code = await issueCode();
    await request(app)
      .post('/api/v1/auth/native/exchange')
      .send({ ...exchangeBody(code), codeVerifier: 'b'.repeat(43) })
      .expect(401);
    await exchange(code).expect(401);
  });

  it.each([
    { clientId: 'another-app' },
    { redirectUri: 'vetify-planner://other/callback' },
    { codeVerifier: 'too-short' },
    { codeVerifier: 'x'.repeat(129) },
    { codeVerifier: '+'.repeat(43) },
    { code: '' },
    { code: 'x'.repeat(129) },
  ])('rejects exchanges with invalid client, return URI or proof: %j', async (invalid) => {
    const { app, issueCode } = await signedInMain();
    await request(app)
      .post('/api/v1/auth/native/exchange')
      .send({ ...exchangeBody(await issueCode()), ...invalid })
      .expect(400);
  });

  it('does not trust a user ID as an authorization code', async () => {
    await request(createMockMain())
      .post('/api/v1/auth/native/exchange')
      .send(exchangeBody('000000000000000000000001'))
      .expect(401);
  });
});
