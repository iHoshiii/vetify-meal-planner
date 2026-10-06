import { getSession, writeSession, type AuthSession } from './session';
import { ApiError, readResponse } from '@/services/api-error';

export const MAIN_API_URL = import.meta.env.VITE_MAIN_API_URL ?? '/main-api/v1';
let refreshInFlight: Promise<AuthSession> | null = null;

export function refreshSession(): Promise<AuthSession> {
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
      writeSession(value);
      return value;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) writeSession(null);
      throw error;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}
export async function logout() {
  try {
    const token = getSession()?.accessToken;
    await readResponse(
      await fetch(`${MAIN_API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
    );
  } finally {
    writeSession(null);
  }
}
export function loginUrl() {
  const value = new URL(
    import.meta.env.VITE_MAIN_LOGIN_URL ?? 'http://127.0.0.1:8002/login',
    window.location.href,
  );
  value.searchParams.set('returnTo', window.location.href);
  return value.href;
}
