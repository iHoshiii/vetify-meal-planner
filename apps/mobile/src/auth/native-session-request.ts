import { z } from 'zod';
import { serverUrls } from '../config';
import { ApiError, readResponse } from '../services/api-error';
import { reportAuthFailure } from './auth-diagnostics';
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
export async function requestNativeSession(
  action: 'login' | 'signup' | 'refresh' | 'exchange' | 'oauth/exchange',
  body: unknown,
) {
  const endpoint = `${serverUrls().main}/auth/native/${action}`;
  const signal = AbortSignal.timeout(15000);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      throw error;
    }
    throw connectionError(endpoint, error, signal);
  }
  const parsed = authSchema.safeParse(value);
  if (!parsed.success) {
    reportAuthFailure(endpoint, 'invalid-response', response.status);
    throw new ApiError(503, 'The account service returned an invalid mobile session.');
  }
  return parsed;
}
