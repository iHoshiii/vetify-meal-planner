import { getSession, writeSession, type AuthSession } from './session';
import { ApiError, readResponse } from '@/services/api-error';

export const MAIN_API_URL = import.meta.env.VITE_MAIN_API_URL ?? '/main-api/v1';
let refreshInFlight: Promise<AuthSession> | null = null;
let generation = 0;

export function refreshSession(): Promise<AuthSession> {
  const started = generation;
  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(`${MAIN_API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      const value = await readResponse<AuthSession>(response);
      if (
        typeof value?.accessToken !== 'string' ||
        !value.accessToken ||
        typeof value.user?.id !== 'string' ||
        !value.user.id ||
        (value.user.name !== null && typeof value.user.name !== 'string') ||
        typeof value.user.email !== 'string' ||
        !['user', 'professional', 'admin'].includes(value.user.role)
      ) {
        throw new ApiError(503, 'The account service returned an invalid session.');
      }
      if (started !== generation) throw new ApiError(401, 'The account session changed.');
      writeSession(value);
      return value;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && started === generation)
        writeSession(null);
      throw error;
    } finally {
      if (started === generation) refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}
export async function logout() {
  generation += 1;
  refreshInFlight = null;
  const token = getSession()?.accessToken;
  writeSession(null);
  await readResponse(
    await fetch(`${MAIN_API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  );
}
export function loginUrl() {
  const value = new URL(
    import.meta.env.VITE_MAIN_LOGIN_URL ?? 'http://127.0.0.1:8002/login',
    window.location.href,
  );
  value.searchParams.set('returnTo', window.location.href);
  return value.href;
}
