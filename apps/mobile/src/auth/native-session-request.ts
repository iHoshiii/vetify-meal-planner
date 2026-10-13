import { z } from 'zod';
import { serverUrls } from '../config';
import { ApiError, readResponse } from '../services/api-error';
import { reportAuthFailure } from './auth-diagnostics';
import { accountUserSchema, emailDeliverySchema } from './account-contract';
const authSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  user: accountUserSchema,
  emailVerification: emailDeliverySchema.optional(),
});
function connectionError(endpoint: string, error: unknown, signal: AbortSignal) {
  const timedOut =
    signal.aborted ||
    (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name));
  const reason = timedOut ? 'request-timeout' : 'network-unreachable';
  reportAuthFailure(endpoint, reason);
  return new ApiError(
    0,
    timedOut
      ? 'Vetify is taking too long to respond. Please try again.'
      : 'Cannot connect to Vetify. Check your connection and try again.',
    reason,
  );
}
export async function requestNativeAccount(action: string, body: unknown, token?: string) {
  const endpoint = `${serverUrls().main}/auth/native/${action}`;
  const signal = AbortSignal.timeout(15000);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    throw connectionError(endpoint, error, signal);
  }
  let value: unknown;
  try {
    value = await readResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      reportAuthFailure(endpoint, 'http-error', response.status);
      if (response.status >= 500) {
        throw new ApiError(503, 'Cannot connect to Vetify. Please try again.', 'main-unavailable');
      }
      if (action === 'login' && error.status === 401 && error.reason !== 'account-not-found') {
        throw new ApiError(401, 'Invalid credentials', error.reason);
      }
      throw error;
    }
    throw connectionError(endpoint, error, signal);
  }
  return value;
}
export async function requestNativeSession(
  action: 'login' | 'signup' | 'refresh' | 'exchange' | 'oauth/exchange',
  body: unknown,
) {
  const parsed = authSchema.safeParse(await requestNativeAccount(action, body));
  if (!parsed.success) {
    reportAuthFailure(`${serverUrls().main}/auth/native/${action}`, 'invalid-response', 200);
    throw new ApiError(503, 'The account service returned an invalid mobile session.');
  }
  return parsed;
}
