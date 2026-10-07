import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';
import { serverUrls } from '../config';
import { ApiError, readResponse } from '../services/api-error';
import { clearDrafts, getSession, writeSession, type AuthSession } from './session';

const refreshKey = 'vetify.refresh-token';
const authSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  user: z.object({
    id: z.string().min(1),
    name: z.string().nullable(),
    email: z.string(),
    role: z.enum(['user', 'professional', 'admin']),
  }),
});
let refreshInFlight: Promise<AuthSession> | null = null;
let generation = 0;
let credentials: Promise<unknown> = Promise.resolve();
function withCredentials<T>(action: () => Promise<T>): Promise<T> {
  const next = credentials.catch(() => undefined).then(action);
  credentials = next;
  return next;
}
async function requestSession(
  action: 'login' | 'refresh',
  body: unknown,
  started: number,
): Promise<AuthSession> {
  const value = await readResponse(
    await fetch(`${serverUrls().main}/auth/native/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    }),
  );
  const parsed = authSchema.safeParse(value);
  if (!parsed.success)
    throw new ApiError(503, 'The account service returned an invalid mobile session.');
  const session = { accessToken: parsed.data.accessToken, user: parsed.data.user };
  await withCredentials(async () => {
    if (started !== generation) throw new ApiError(401, 'The account session changed.');
    await SecureStore.setItemAsync(refreshKey, parsed.data.refreshToken);
    if (started !== generation) throw new ApiError(401, 'The account session changed.');
    writeSession(session);
  });
  return session;
}
export async function login(userId: string) {
  if (!__DEV__) throw new Error('Demo login is available only in development.');
  generation += 1;
  refreshInFlight = null;
  return requestSession('login', { userId }, generation);
}
export function refreshSession(): Promise<AuthSession> {
  const started = generation;
  refreshInFlight ??= (async () => {
    try {
      const refreshToken = await withCredentials(() => SecureStore.getItemAsync(refreshKey));
      if (!refreshToken) throw new ApiError(401, 'Sign in to your account.');
      return await requestSession('refresh', { refreshToken }, started);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && started === generation) {
        await withCredentials(async () => {
          if (started !== generation) return;
          await SecureStore.deleteItemAsync(refreshKey);
          if (started === generation) writeSession(null);
        });
      }
      throw error;
    } finally {
      if (started === generation) refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}
export async function logout() {
  const ownerId = getSession()?.user.id;
  generation += 1;
  refreshInFlight = null;
  writeSession(null);
  try {
    const refreshToken = await withCredentials(async () => {
      const token = await SecureStore.getItemAsync(refreshKey);
      await SecureStore.deleteItemAsync(refreshKey);
      return token;
    });
    if (refreshToken)
      await readResponse(
        await fetch(`${serverUrls().main}/auth/native/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
          signal: AbortSignal.timeout(10000),
        }),
      );
  } finally {
    await clearDrafts(ownerId);
  }
}
