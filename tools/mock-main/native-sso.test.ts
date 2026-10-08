import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { nativeRedirectUri } from '@vetify/planner-shared/native-auth';
import { createMockMain } from './app';
import { demoUsers } from './demo-users';
import { authorization, signedInMain } from './native-sso.fixtures';

describe('native account handoff', () => {
  it('reuses main browser login without another account prompt or tokens in the redirect', async () => {
    const { app, authorize, login, exchange } = await signedInMain();
    const response = await authorize();
    const callback = new URL(response.headers.location);
    expect(`${callback.protocol}//${callback.host}${callback.pathname}`).toBe(nativeRedirectUri);
    expect(callback.searchParams.get('state')).toBe(authorization.state);
    expect([...callback.searchParams.keys()].sort()).toEqual(['code', 'state']);
    expect(response.headers.location).not.toContain(login.body.accessToken);
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

  it('returns login_required without offering a separate mobile login', async () => {
    const response = await request(createMockMain())
      .get('/api/v1/auth/native/authorize')
      .query(authorization)
      .expect(302);
    const callback = new URL(response.headers.location);
    expect(callback.searchParams.get('error')).toBe('login_required');
    expect(callback.searchParams.get('state')).toBe(authorization.state);
    expect(callback.searchParams.has('code')).toBe(false);
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
