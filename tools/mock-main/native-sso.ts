import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Express } from 'express';
import { z } from 'zod';
import {
  nativeClientId,
  nativeRedirectUri,
  nativeCodeExchangeSchema,
} from '@vetify/planner-shared/native-auth';
import { demoUsers } from './demo-users';
import type { createSessionStore } from './session-store';

const authorizeSchema = z.strictObject({
  client_id: z.literal(nativeClientId),
  redirect_uri: z.literal(nativeRedirectUri),
  response_type: z.literal('code'),
  state: z.string().regex(/^[A-Za-z0-9._~-]{16,128}$/),
  code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  code_challenge_method: z.literal('S256'),
});
type Grant = { sourceToken: string; challenge: string; expiresAt: number };

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
  app.get('/api/v1/auth/native/authorize', (req, res) => {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    const parsed = authorizeSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid authorization request' });
    const callback = new URL(nativeRedirectUri);
    callback.searchParams.set('state', parsed.data.state);
    const sourceToken = refreshCookie(req.headers.cookie);
    if (!activeUser(sourceToken)) {
      callback.searchParams.set('error', 'login_required');
      return res.redirect(302, callback.href);
    }
    prune();
    if (grants.size >= 512) grants.delete(grants.keys().next().value!);
    const code = randomBytes(32).toString('base64url');
    grants.set(code, {
      sourceToken,
      challenge: parsed.data.code_challenge,
      expiresAt: now() + 60_000,
    });
    callback.searchParams.set('code', code);
    return res.redirect(302, callback.href);
  });
  app.post('/api/v1/auth/native/exchange', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const parsed = nativeCodeExchangeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid code exchange request' });
    const grant = grants.get(parsed.data.code);
    grants.delete(parsed.data.code);
    prune();
    const challenge = createHash('sha256').update(parsed.data.codeVerifier).digest('base64url');
    if (
      !grant ||
      grant.expiresAt <= now() ||
      !timingSafeEqual(Buffer.from(grant.challenge), Buffer.from(challenge))
    )
      return res.status(401).json({ error: 'Invalid or expired authorization code' });
    const user = activeUser(grant.sourceToken);
    if (!user) return res.status(401).json({ error: 'The main account session has ended' });
    const { session, refreshToken } = sessions.login(user);
    return res.json({ ...session, refreshToken });
  });
}
