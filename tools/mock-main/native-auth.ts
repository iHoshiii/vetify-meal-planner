import type { Express } from 'express';
import { demoUsers } from './demo-users';
import type { createSessionStore } from './session-store';

export function registerNativeAuth(app: Express, sessions: ReturnType<typeof createSessionStore>) {
  app.post('/api/v1/auth/native/login', (req, res) => {
    const user = demoUsers.find((candidate) => candidate.id === req.body?.userId);
    if (!user) return res.status(401).json({ error: 'Unknown demo user' });
    const { session, refreshToken } = sessions.login(user);
    return res.json({ ...session, refreshToken });
  });
  app.post('/api/v1/auth/native/refresh', (req, res) => {
    const token = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : '';
    const session = sessions.refresh(token);
    return session
      ? res.json({ ...session, refreshToken: token })
      : res.status(401).json({ error: 'Sign in to the demo account service' });
  });
  app.post('/api/v1/auth/native/logout', (req, res) => {
    if (typeof req.body?.refreshToken === 'string') sessions.logout(req.body.refreshToken);
    return res.status(204).end();
  });
}
