import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';
import {
  nativeClientId,
  nativeRedirectUri,
  nativeSocialRedirectUri,
} from '@vetify/planner-shared/native-auth';
import { serverUrls } from '../config';
import { ApiError, readResponse } from '../services/api-error';
import { reportAuthFailure } from './auth-diagnostics';
import { clearDrafts, getSession, writeSession, type AuthSession } from './session';

const legacyRefreshKey = 'vetify.refresh-token';
const rememberedRefreshKey = 'vetify.remembered-refresh-token';
export type SignInOptions = { rememberMe?: boolean };
export type LoginInput = { email: string; password: string };
export type SignupInput = LoginInput & { name: string; confirmPassword: string };
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
let refreshCredential: { token: string; remembered: boolean } | null = null;
let generation = 0;
let credentials: Promise<unknown> = Promise.resolve();
function withCredentials<T>(action: () => Promise<T>): Promise<T> {
  const next = credentials.catch(() => undefined).then(action);
  credentials = next;
  return next;
}
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
async function requestSession(
  action: 'login' | 'signup' | 'refresh' | 'exchange' | 'oauth/exchange',
  body: unknown,
  started: number,
  rememberMe: boolean,
): Promise<AuthSession> {
  if (started !== generation) throw new ApiError(401, 'The account session changed.');
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
  const session = { accessToken: parsed.data.accessToken, user: parsed.data.user };
  await withCredentials(async () => {
    if (started !== generation) throw new ApiError(401, 'The account session changed.');
    await SecureStore.deleteItemAsync(legacyRefreshKey);
    if (rememberMe) await SecureStore.setItemAsync(rememberedRefreshKey, parsed.data.refreshToken);
    else await SecureStore.deleteItemAsync(rememberedRefreshKey);
    if (started !== generation) throw new ApiError(401, 'The account session changed.');
    refreshCredential = { token: parsed.data.refreshToken, remembered: rememberMe };
    writeSession(session);
  });
  return session;
}
export async function login(input: LoginInput, options: SignInOptions = {}) {
  generation += 1;
  refreshInFlight = null;
  return requestSession('login', input, generation, options.rememberMe === true);
}
export async function signup(input: SignupInput) {
  generation += 1;
  refreshInFlight = null;
  return requestSession('signup', input, generation, false);
}
export function beginSocialLogin(options: SignInOptions = {}) {
  generation += 1;
  refreshInFlight = null;
  const started = generation;
  const rememberMe = options.rememberMe === true;
  return (code: string, codeVerifier: string) =>
    requestSession(
      'oauth/exchange',
      { code, codeVerifier, clientId: nativeClientId, redirectUri: nativeSocialRedirectUri },
      started,
      rememberMe,
    );
}
export async function exchangeMainCode(code: string): Promise<AuthSession> {
  generation += 1;
  const started = generation;
  refreshInFlight = null;
  refreshCredential = null;
  writeSession(null);
  await withCredentials(async () => {
    if (started !== generation) throw new ApiError(401, 'The account session changed.');
    await SecureStore.deleteItemAsync(legacyRefreshKey);
    await SecureStore.deleteItemAsync(rememberedRefreshKey);
  });
  return requestSession(
    'exchange',
    { code, clientId: nativeClientId, redirectUri: nativeRedirectUri },
    started,
    false,
  );
}
export function refreshSession(): Promise<AuthSession> {
  const started = generation;
  refreshInFlight ??= (async () => {
    try {
      const credential = await withCredentials(async () => {
        if (started !== generation) throw new ApiError(401, 'The account session changed.');
        if (refreshCredential) return refreshCredential;
        await SecureStore.deleteItemAsync(legacyRefreshKey);
        const token = await SecureStore.getItemAsync(rememberedRefreshKey);
        return token ? { token, remembered: true } : null;
      });
      if (!credential) throw new ApiError(401, 'Log in to your Vetify account.', 'login-required');
      return await requestSession(
        'refresh',
        { refreshToken: credential.token },
        started,
        credential.remembered,
      );
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 400) &&
        started === generation
      ) {
        await withCredentials(async () => {
          if (started !== generation) return;
          await SecureStore.deleteItemAsync(legacyRefreshKey);
          await SecureStore.deleteItemAsync(rememberedRefreshKey);
          if (started === generation) {
            refreshCredential = null;
            writeSession(null);
          }
        });
        if (error.status === 400)
          throw new ApiError(401, 'Your session has expired. Log in again.', 'session-expired');
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
  const activeRefreshToken = refreshCredential?.token;
  generation += 1;
  refreshInFlight = null;
  refreshCredential = null;
  writeSession(null);
  try {
    const refreshToken = await withCredentials(async () => {
      const token = activeRefreshToken ?? (await SecureStore.getItemAsync(rememberedRefreshKey));
      await SecureStore.deleteItemAsync(legacyRefreshKey);
      await SecureStore.deleteItemAsync(rememberedRefreshKey);
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
