import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { nativeRedirectUri } from '@vetify/planner-shared/native-auth';
import { createMockMain } from './app';
import { demoUsers } from './demo-users';
import { handoffBody, signedInMain } from './native-sso.fixtures';

describe('native account handoff', () => {
  it('uses the computer main login to issue an account QR without reusable session tokens', async () => {
    const { app, handoff, login, exchange } = await signedInMain();
    const response = await handoff();
    const callback = new URL(response.body.url);
    expect(`${callback.protocol}//${callback.host}${callback.pathname}`).toBe(nativeRedirectUri);
    expect([...callback.searchParams.keys()]).toEqual(['code']);
    expect(response.body.url).not.toContain(login.body.accessToken);
    const sourceRefresh = login.headers['set-cookie'][0].split(';')[0].split('=')[1];
    expect(response.body.url).not.toContain(sourceRefresh);
    const lifetime = Date.parse(response.body.expiresAt) - Date.now();
    expect(lifetime).toBeGreaterThan(0);
    expect(lifetime).toBeLessThanOrEqual(60_000);
    expect(response.headers['cache-control']).toBe('no-store');
    const mobile = await exchange(callback.searchParams.get('code')!).expect(200);
    expect(mobile.body.user.id).toBe(demoUsers[0].id);
    expect(mobile.headers['set-cookie']).toBeUndefined();
    expect(mobile.body.refreshToken).toEqual(expect.any(String));
    expect(mobile.body.accessToken).not.toBe(login.body.accessToken);
    await request(app)
      .post('/api/v1/auth/introspect')
      .set('Authorization', `Bearer ${mobile.body.accessToken}`)
      .expect(200);
  });

  it('refuses to issue an account QR without an existing main browser login', async () => {
    const response = await request(createMockMain())
      .post('/api/v1/auth/native/handoff')
      .send(handoffBody)
      .expect(401);
    expect(response.body.url).toBeUndefined();
  });

  it('consumes codes once even when concurrent requests try the same grant', async () => {
    const { issueCode, exchange } = await signedInMain();
    const code = await issueCode();
    const results = await Promise.all([exchange(code), exchange(code)]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 401]);
    await exchange(code).expect(401);
  });

  it('expires codes after one minute while the main browser login remains valid', async () => {
    let clock = Date.now();
    const { browser, issueCode, exchange } = await signedInMain(() => clock);
    const code = await issueCode();
    clock += 60_000;
    await exchange(code).expect(401);
    await browser.post('/api/v1/auth/refresh').expect(200);
  });

  it('rejects codes after the source main session is revoked', async () => {
    const { browser, issueCode, exchange } = await signedInMain();
    const code = await issueCode();
    await browser.post('/api/v1/auth/logout').expect(204);
    await exchange(code).expect(401);
  });

  it('refuses another account QR after the browser session has ended', async () => {
    const { browser } = await signedInMain();
    await browser.post('/api/v1/auth/logout').expect(204);
    await browser.post('/api/v1/auth/native/handoff').send(handoffBody).expect(401);
  });

  it('keeps the established native session independent of subsequent browser logout', async () => {
    const { app, browser, issueCode, exchange } = await signedInMain();
    const mobile = await exchange(await issueCode()).expect(200);
    await browser.post('/api/v1/auth/logout').expect(204);
    await request(app)
      .post('/api/v1/auth/native/refresh')
      .send({ refreshToken: mobile.body.refreshToken })
      .expect(200);
  });
});
