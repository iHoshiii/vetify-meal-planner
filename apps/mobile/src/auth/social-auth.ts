import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { z } from 'zod';
import { nativeClientId, nativeSocialRedirectUri } from '@vetify/planner-shared/native-auth';
import { serverUrls } from '../config';
import { ApiError, readResponse } from '../services/api-error';
import { beginSocialLogin } from './main-auth';

export type SocialProvider = 'facebook' | 'google' | 'tiktok';
const startSchema = z.object({ url: z.string().url() });
const socialErrors: Record<string, string> = {
  blocked: 'This account cannot sign in.',
  unconfigured: 'Social login is unavailable.',
  'signup-required': 'This social account needs a linked Vetify account.',
};

async function randomHex(length: number) {
  const bytes = await Crypto.getRandomBytesAsync(length);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function loginWithSocial(provider: SocialProvider): Promise<boolean> {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient)
    throw new Error(
      'Social login needs an installed development build or APK. Expo Go supports email and password.',
    );
  const complete = beginSocialLogin();
  const verifier = await randomHex(32);
  const state = await randomHex(16);
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });
  const codeChallenge = digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const main = serverUrls().main;
  const payload = await readResponse(
    await fetch(`${main}/auth/native/oauth/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        codeChallenge,
        state,
        clientId: nativeClientId,
        redirectUri: nativeSocialRedirectUri,
      }),
      signal: AbortSignal.timeout(15000),
    }),
  );
  const parsed = startSchema.safeParse(payload);
  if (!parsed.success) throw new ApiError(503, 'Could not start social login.');
  const start = new URL(parsed.data.url);
  const api = new URL(main);
  if (
    start.origin !== api.origin ||
    start.pathname !== `${api.pathname}/auth/${provider}` ||
    start.username ||
    start.password ||
    start.hash
  )
    throw new ApiError(503, 'Social login is not configured for this app yet.');
  const result = await WebBrowser.openAuthSessionAsync(start.href, nativeSocialRedirectUri);
  if (result.type === 'cancel' || result.type === 'dismiss') return false;
  if (result.type !== 'success') throw new ApiError(401, 'Social login did not finish.');
  let callback: URL;
  try {
    callback = new URL(result.url);
  } catch {
    throw new ApiError(401, 'Could not verify social login.');
  }
  if (
    `${callback.protocol}//${callback.host}${callback.pathname}` !== nativeSocialRedirectUri ||
    callback.username ||
    callback.password ||
    callback.hash ||
    callback.searchParams.getAll('state').length !== 1 ||
    callback.searchParams.get('state') !== state ||
    callback.searchParams.getAll('code').length > 1 ||
    callback.searchParams.getAll('error').length > 1
  )
    throw new ApiError(401, 'Could not verify social login.');
  const error = callback.searchParams.get('error');
  if (error === 'denied') return false;
  if (error) throw new ApiError(401, socialErrors[error] ?? 'Social login failed. Try again.');
  const code = callback.searchParams.get('code');
  if (!code || !/^[a-f0-9]{64}$/.test(code))
    throw new ApiError(401, 'Could not verify social login.');
  await complete(code, verifier);
  return true;
}
