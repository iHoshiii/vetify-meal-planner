import { randomBytes } from 'node:crypto';
import type { Introspection } from '@vetify/planner-shared/core-contract';
import type { DemoUser } from './demo-users';

type Session = { user: DemoUser; expiresAt: number };
type Access = { sessionId: string; expiresAt: number };

export function createSessionStore(now = Date.now, proCapabilities = ['planner.demo-pro']) {
  const sessions = new Map<string, Session>();
  const access = new Map<string, Access>();
  function prune() {
    for (const [key, value] of sessions) if (value.expiresAt <= now()) sessions.delete(key);
    for (const [key, value] of access) if (value.expiresAt <= now()) access.delete(key);
  }
  function mint(sessionId: string) {
    prune();
    const session = sessions.get(sessionId);
    if (!session) return null;
    const accessToken = randomBytes(24).toString('hex');
    access.set(accessToken, { sessionId, expiresAt: now() + 15 * 60_000 });
    const { id, name, email, role } = session.user;
    return { accessToken, user: { id, name, email, role } };
  }
  return {
    login(user: DemoUser) {
      prune();
      const refreshToken = randomBytes(24).toString('hex');
      sessions.set(refreshToken, { user, expiresAt: now() + 24 * 60 * 60_000 });
      return { refreshToken, session: mint(refreshToken)! };
    },
    refresh: mint,
    logout(refreshToken: string) {
      sessions.delete(refreshToken);
      for (const [key, value] of access) if (value.sessionId === refreshToken) access.delete(key);
    },
    introspect(token: string): Introspection | null {
      prune();
      const issued = access.get(token);
      const session = issued && sessions.get(issued.sessionId);
      if (!issued || !session) return null;
      const { id, role, status, plan } = session.user;
      const boundary = new Date(Math.min(issued.expiresAt, session.expiresAt)).toISOString();
      return {
        version: 1,
        user: { id, role, status },
        region: { timeZone: 'Asia/Manila' },
        subscription: { plan, status: plan === 'pro' ? 'active' : null, expiresAt: null },
        entitlements: plan === 'pro' ? proCapabilities : [],
        tokenExpiresAt: new Date(issued.expiresAt).toISOString(),
        validUntil: boundary,
      };
    },
  };
}
