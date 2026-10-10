import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  constants: { executionEnvironment: 'standalone' },
  random: vi.fn(),
  digest: vi.fn(),
  browser: vi.fn(),
  begin: vi.fn(),
  complete: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock('expo-constants', () => ({
  default: mocks.constants,
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));
vi.mock('expo-crypto', () => ({
  getRandomBytesAsync: mocks.random,
  digestStringAsync: mocks.digest,
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { BASE64: 'base64' },
}));
vi.mock('expo-web-browser', () => ({ openAuthSessionAsync: mocks.browser }));
vi.mock('../config', () => ({
  serverUrls: () => ({ main: 'http://localhost:5000/api/v1' }),
}));
vi.mock('./main-auth', () => ({ beginSocialLogin: mocks.begin }));
import { loginWithSocial } from './social-auth';

const verifier = 'ab'.repeat(32);
const state = 'cd'.repeat(16);
const code = 'ef'.repeat(32);
const callback = `vetify-planner://auth/social?code=${code}&state=${state}`;
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

describe('native social login', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', mocks.fetch);
    mocks.constants.executionEnvironment = 'standalone';
    mocks.random.mockImplementation(async (length: number) =>
      new Uint8Array(length).fill(length === 32 ? 0xab : 0xcd),
    );
    mocks.digest.mockImplementation(async (_algorithm: string, value: string) =>
      createHash('sha256').update(value).digest('base64'),
    );
    mocks.begin.mockReturnValue(mocks.complete);
    mocks.complete.mockResolvedValue({});
    mocks.fetch.mockImplementation(async (_url: string, request: RequestInit) => {
      const { provider } = JSON.parse(request.body as string);
      return response({ url: `http://localhost:5000/api/v1/auth/${provider}` });
    });
    mocks.browser.mockResolvedValue({ type: 'success', url: callback });
  });

  it.each(['facebook', 'google', 'tiktok'] as const)(
    'exchanges a %s callback with app state and PKCE proof',
    async (provider) => {
      await expect(loginWithSocial(provider)).resolves.toBe(true);
      const body = JSON.parse(mocks.fetch.mock.calls[0][1].body);
      expect(body).toEqual({
        provider,
        codeChallenge: createHash('sha256').update(verifier).digest('base64url'),
        state,
        clientId: 'vetify-meal-planner',
        redirectUri: 'vetify-planner://auth/social',
      });
      expect(body).not.toHaveProperty('codeVerifier');
      expect(mocks.browser).toHaveBeenCalledExactlyOnceWith(
        `http://localhost:5000/api/v1/auth/${provider}`,
        'vetify-planner://auth/social',
      );
      expect(mocks.complete).toHaveBeenCalledExactlyOnceWith(code, verifier);
      expect(mocks.begin).toHaveBeenCalledExactlyOnceWith({});
    },
  );

  it.each([true, false])(
    'forwards Remember me = %s to the credential exchange',
    async (rememberMe) => {
      await expect(loginWithSocial('google', { rememberMe })).resolves.toBe(true);
      expect(mocks.begin).toHaveBeenCalledExactlyOnceWith({ rememberMe });
    },
  );

  it('reports the Expo Go limitation only when social login is requested', async () => {
    mocks.constants.executionEnvironment = 'storeClient';
    await expect(loginWithSocial('google')).rejects.toThrow(
      'needs an installed development build or APK',
    );
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.browser).not.toHaveBeenCalled();
    expect(mocks.begin).not.toHaveBeenCalled();
  });

  it.each(['cancel', 'dismiss'])('keeps %s separate from authentication success', async (type) => {
    mocks.browser.mockResolvedValueOnce({ type });
    await expect(loginWithSocial('google')).resolves.toBe(false);
    expect(mocks.complete).not.toHaveBeenCalled();
  });

  it.each([
    callback.replace(state, 'wrong-state'),
    callback.replace('vetify-planner:', 'https:'),
    callback.replace('/social?', '/callback?'),
    `${callback}&state=${state}`,
    `${callback}&code=${code}`,
    `${callback}#fragment`,
    `vetify-planner://auth/social?state=${state}`,
    'invalid-url',
  ])('rejects an invalid callback without issuing a session: %s', async (url) => {
    mocks.browser.mockResolvedValueOnce({ type: 'success', url });
    await expect(loginWithSocial('google')).rejects.toMatchObject({ status: 401 });
    expect(mocks.complete).not.toHaveBeenCalled();
  });

  it('treats a verified provider denial as cancellation', async () => {
    mocks.browser.mockResolvedValueOnce({
      type: 'success',
      url: `vetify-planner://auth/social?error=denied&state=${state}`,
    });
    await expect(loginWithSocial('google')).resolves.toBe(false);
    expect(mocks.complete).not.toHaveBeenCalled();
  });

  it('surfaces a concise provider error without signing in', async () => {
    mocks.browser.mockResolvedValueOnce({
      type: 'success',
      url: `vetify-planner://auth/social?error=signup-required&state=${state}`,
    });
    await expect(loginWithSocial('tiktok')).rejects.toThrow('needs a linked Vetify account');
    expect(mocks.complete).not.toHaveBeenCalled();
  });

  it.each([
    { url: 'https://untrusted.example/api/v1/auth/google' },
    { url: 'http://localhost:5000/api/v1/auth/facebook' },
    { url: 'http://user:password@localhost:5000/api/v1/auth/google' },
    { url: 'http://localhost:5000/api/v1/auth/google#fragment' },
    {},
  ])('rejects an invalid browser start URL', async (value) => {
    mocks.fetch.mockResolvedValueOnce(response(value));
    await expect(loginWithSocial('google')).rejects.toMatchObject({ status: 503 });
    expect(mocks.browser).not.toHaveBeenCalled();
    expect(mocks.complete).not.toHaveBeenCalled();
  });

  it('shows server configuration errors without opening a browser', async () => {
    mocks.fetch.mockResolvedValueOnce(response({ error: 'Google login is unavailable.' }, 503));
    await expect(loginWithSocial('google')).rejects.toThrow('Google login is unavailable.');
    expect(mocks.browser).not.toHaveBeenCalled();
  });
});
