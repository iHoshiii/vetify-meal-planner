import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMockMain } from './app';
import { demoUsers } from './demo-users';

afterEach(() => vi.unstubAllEnvs());

describe('local mock main', () => {
  it('provides first login, refresh, introspection and logout without a planner user database', async () => {
    const app = createMockMain();
    const browser = request.agent(app);
    const login = await browser
      .post('/api/v1/auth/login')
      .send({ userId: demoUsers[0].id })
      .expect(200);
    const refreshed = await browser.post('/api/v1/auth/refresh').expect(200);
    expect(refreshed.body.accessToken).not.toBe(login.body.accessToken);
    const principal = await browser
      .post('/api/v1/auth/introspect')
      .set('Authorization', `Bearer ${refreshed.body.accessToken}`)
      .expect(200);
    expect(principal.body.user.id).toBe(demoUsers[0].id);
    expect(principal.body.entitlements).toEqual([]);
    await browser.post('/api/v1/auth/logout').expect(204);
    await browser.post('/api/v1/auth/refresh').expect(401);
    await browser
      .post('/api/v1/auth/introspect')
      .set('Authorization', `Bearer ${refreshed.body.accessToken}`)
      .expect(401);
  });
  it('rejects arbitrary redirect hosts and accepts the local first-login form', async () => {
    const app = createMockMain();
    await request(app).get('/login').query({ returnTo: 'https://example.com' }).expect(400);
    await request(app)
      .get('/login')
      .query({ returnTo: 'http://127.0.0.1:5174.evil.test' })
      .expect(400);
    const response = await request(app)
      .post('/login')
      .type('form')
      .send({ userId: demoUsers[0].id, returnTo: 'http://127.0.0.1:5174/' })
      .expect(303);
    expect(response.headers.location).toBe('http://127.0.0.1:5174/');
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
  });
  it('rejects production mode', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(createMockMain).toThrow('cannot run in production');
  });
});
