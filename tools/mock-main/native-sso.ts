import { randomBytes } from 'node:crypto';
import type { Express } from 'express';
import {
  nativeRedirectUri,
  nativeCodeExchangeSchema,
  nativeHandoffRequestSchema,
} from '@vetify/planner-shared/native-auth';
import { demoUsers } from './demo-users';
import type { createSessionStore } from './session-store';

type Grant = {
  sourceToken: string;
  clientId: string;
  redirectUri: string;
  expiresAt: number;
};

export function registerNativeSso(
  app: Express,
  sessions: ReturnType<typeof createSessionStore>,
  refreshCookie: (header?: string) => string,
  now = Date.now,
) {
  const grants = new Map<string, Grant>();
  function prune() {
    for (const [code, grant] of grants) if (grant.expiresAt <= now()) grants.delete(code);
  }
  function activeUser(sourceToken: string) {
    const source = sessions.refresh(sourceToken);
    if (!source) return null;
    const principal = sessions.introspect(source.accessToken);
    return principal?.user.status === 'active'
      ? (demoUsers.find((user) => user.id === source.user.id) ?? null)
      : null;
  }
  app.post('/api/v1/auth/native/handoff', (req, res) => {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    const parsed = nativeHandoffRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid handoff request' });
    const sourceToken = refreshCookie(req.headers.cookie);
    if (!activeUser(sourceToken))
      return res.status(401).json({ error: 'Sign in to the main account service' });
    prune();
    if (grants.size >= 512) grants.delete(grants.keys().next().value!);
    const code = randomBytes(32).toString('base64url');
    const expiresAt = now() + 60_000;
    grants.set(code, {
      sourceToken,
      clientId: parsed.data.clientId,
      redirectUri: parsed.data.redirectUri,
      expiresAt,
    });
    const callback = new URL(nativeRedirectUri);
    callback.searchParams.set('code', code);
    return res.json({ url: callback.href, expiresAt: new Date(expiresAt).toISOString() });
  });
  app.post('/api/v1/auth/native/exchange', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const parsed = nativeCodeExchangeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid code exchange request' });
    const grant = grants.get(parsed.data.code);
    grants.delete(parsed.data.code);
    prune();
    if (
      !grant ||
      grant.expiresAt <= now() ||
      grant.clientId !== parsed.data.clientId ||
      grant.redirectUri !== parsed.data.redirectUri
    )
      return res.status(401).json({ error: 'Invalid or expired authorization code' });
    const user = activeUser(grant.sourceToken);
    if (!user) return res.status(401).json({ error: 'The main account session has ended' });
    const { session, refreshToken } = sessions.login(user);
    return res.json({ ...session, refreshToken });
  });
}
