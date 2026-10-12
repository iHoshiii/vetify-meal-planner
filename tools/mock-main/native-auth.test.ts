import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createMockMain } from './app';
import { demoUsers } from './demo-users';

describe('native demo authentication', () => {
  it('refreshes without cookies and revokes every access token on logout', async () => {
    const app = createMockMain();
    const login = await request(app)
      .post('/api/v1/auth/native/login')
      .send({ userId: demoUsers[0].id })
      .expect(200);
    expect(login.headers['set-cookie']).toBeUndefined();
    const refresh = await request(app)
      .post('/api/v1/auth/native/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(200);
    expect(refresh.body.accessToken).not.toBe(login.body.accessToken);
    const principal = await request(app)
      .post('/api/v1/auth/introspect')
      .set('Authorization', `Bearer ${refresh.body.accessToken}`)
      .expect(200);
    expect(principal.body.user.id).toBe(demoUsers[0].id);
    await request(app)
      .post('/api/v1/auth/native/logout')
      .send({ refreshToken: login.body.refreshToken })
      .expect(204);
    await request(app)
      .post('/api/v1/auth/native/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(401);
    for (const token of [login.body.accessToken, refresh.body.accessToken]) {
      await request(app)
        .post('/api/v1/auth/introspect')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    }
  });
  it('rejects unknown accounts and missing refresh credentials', async () => {
    const app = createMockMain();
    await request(app).post('/api/v1/auth/native/login').send({ userId: 'unknown' }).expect(401);
    await request(app).post('/api/v1/auth/native/refresh').send({}).expect(401);
  });
});
