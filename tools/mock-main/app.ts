import express from 'express';
import cors from 'cors';
import { demoOrigins, demoUsers, mockCookieName } from './demo-users';
import { loginPage, safeReturnTo } from './login-page';
import { createSessionStore } from './session-store';

export function createMockMain() {
  if (process.env.NODE_ENV === 'production') throw new Error('Mock main cannot run in production');
  const app = express();
  const capabilities = (process.env.MOCK_PRO_CAPABILITIES ?? 'planner.demo-pro')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const sessions = createSessionStore(Date.now, capabilities);
  app.disable('x-powered-by');
  app.use(cors({ origin: demoOrigins, credentials: true }));
  app.use(express.json({ limit: '16kb' }));
  app.use(express.urlencoded({ extended: false, limit: '16kb' }));
  const cookie = { httpOnly: true, sameSite: 'lax' as const, path: '/', maxAge: 86_400_000 };
  function refreshCookie(header?: string) {
    const value = header
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${mockCookieName}=`));
    return value?.slice(mockCookieName.length + 1) ?? '';
  }
  app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', mode: 'local-mock' }));
  app.get('/login', (req, res) => {
    const returnTo = safeReturnTo(req.query.returnTo ?? demoOrigins[0]);
    if (!returnTo) return res.status(400).send('Invalid return destination');
    return res.type('html').send(loginPage(returnTo));
  });
  app.post('/login', (req, res) => {
    const returnTo = safeReturnTo(req.body.returnTo);
    const user = demoUsers.find((candidate) => candidate.id === req.body.userId);
    if (!returnTo || !user)
      return res.status(400).send('Choose a demo account and local planner destination');
    const session = sessions.login(user);
    res.cookie(mockCookieName, session.refreshToken, cookie);
    return res.redirect(303, returnTo);
  });
  app.post('/api/v1/auth/login', (req, res) => {
    const user = demoUsers.find((candidate) => candidate.id === req.body.userId);
    if (!user) return res.status(401).json({ error: 'Unknown demo user' });
    const session = sessions.login(user);
    res.cookie(mockCookieName, session.refreshToken, cookie);
    return res.json(session.session);
  });
  app.post('/api/v1/auth/refresh', (req, res) => {
    const session = sessions.refresh(refreshCookie(req.headers.cookie));
    return session
      ? res.json(session)
      : res.status(401).json({ error: 'Sign in to the demo account service' });
  });
  app.post('/api/v1/auth/logout', (req, res) => {
    sessions.logout(refreshCookie(req.headers.cookie));
    res.clearCookie(mockCookieName, { path: '/', httpOnly: true, sameSite: 'lax' });
    return res.status(204).end();
  });
  app.post('/api/v1/auth/introspect', (req, res) => {
    const authorization = req.headers.authorization ?? '';
    const session = sessions.introspect(
      authorization.startsWith('Bearer ') ? authorization.slice(7) : '',
    );
    return session
      ? res.json(session)
      : res.status(401).json({ error: 'Invalid demo session', reason: 'unauthenticated' });
  });
  return app;
}
