import { getSession, readAccessToken } from '../auth/session';
import { refreshSession } from '../auth/main-auth';
import { serverUrls } from '../config';
import { ApiError, readResponse } from './api-error';
export { ApiError } from './api-error';
type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const ownerId = getSession()?.user.id;
  const send = (token: string | null) => {
    const requestHeaders = new Headers(headers);
    if (body !== undefined) requestHeaders.set('Content-Type', 'application/json');
    if (token) requestHeaders.set('Authorization', `Bearer ${token}`);
    return fetch(`${serverUrls().planner}${path}`, {
      ...rest,
      credentials: 'omit',
      headers: requestHeaders,
      signal: rest.signal ?? AbortSignal.timeout(15000),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  };
  let response = await send(readAccessToken());
  if (response.status === 401) {
    if (getSession()?.user.id !== ownerId || rest.signal?.aborted)
      throw new ApiError(401, 'The account session changed.');
    const session = await refreshSession();
    if (session.user.id !== ownerId || rest.signal?.aborted)
      throw new ApiError(401, 'The account session changed.');
    response = await send(session.accessToken);
  }
  const value = await readResponse<T>(response);
  if (getSession()?.user.id !== ownerId || rest.signal?.aborted)
    throw new ApiError(401, 'The account session changed.');
  return value;
}
