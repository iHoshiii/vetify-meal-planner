import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  credentials: new Map<string, string>(),
  drafts: new Map<string, string>(),
  secure: { getItemAsync: vi.fn(), setItemAsync: vi.fn(), deleteItemAsync: vi.fn() },
  storage: { getAllKeys: vi.fn(), removeItem: vi.fn() },
  fetch: vi.fn(),
  diagnostic: vi.fn(),
}));
vi.mock('expo-secure-store', () => mocks.secure);
vi.mock('@react-native-async-storage/async-storage', () => ({ default: mocks.storage }));
vi.mock('../config', () => ({ serverUrls: () => ({ main: 'http://localhost:5000' }) }));
vi.mock('./auth-diagnostics', () => ({ reportAuthFailure: mocks.diagnostic }));

const refreshKey = 'vetify.refresh-token';
const authResponse = {
  accessToken: 'new-access-token',
  refreshToken: 'new-refresh-token',
  user: { id: 'owner-a', name: 'Owner', email: 'owner@example.test', role: 'user' },
};
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const modules = async () => ({ ...(await import('./main-auth')), ...(await import('./session')) });

describe('native account credentials', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    vi.stubGlobal('__DEV__', true);
    vi.stubGlobal('fetch', mocks.fetch);
    mocks.credentials.clear();
    mocks.credentials.set(refreshKey, 'original-refresh-token');
    mocks.drafts.clear();
    mocks.secure.getItemAsync.mockImplementation(
      async (key: string) => mocks.credentials.get(key) ?? null,
    );
    mocks.secure.setItemAsync.mockImplementation(async (key: string, value: string) => {
      mocks.credentials.set(key, value);
    });
    mocks.secure.deleteItemAsync.mockImplementation(async (key: string) => {
      mocks.credentials.delete(key);
    });
    mocks.storage.getAllKeys.mockImplementation(async () => [...mocks.drafts.keys()]);
    mocks.storage.removeItem.mockImplementation(async (key: string) => {
      mocks.drafts.delete(key);
    });
  });

  it('does not restore credentials when a refresh finishes after logout', async () => {
    const { refreshSession, logout, writeSession, getSession } = await modules();
    writeSession(authResponse);
    let finish!: (value: Response) => void;
    mocks.fetch
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const refresh = refreshSession();
    const rejected = expect(refresh).rejects.toMatchObject({ status: 401 });
    await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    await logout();
    finish(response(authResponse));
    await rejected;
    expect(getSession()).toBeNull();
    expect(mocks.credentials.has(refreshKey)).toBe(false);
    expect(mocks.secure.setItemAsync).not.toHaveBeenCalled();
  });

  it('coalesces concurrent refreshes into one request and credential write', async () => {
    const { refreshSession, getSession } = await modules();
    mocks.fetch.mockResolvedValueOnce(response(authResponse));
    const first = refreshSession();
    const second = refreshSession();
    expect(second).toBe(first);
    await Promise.all([first, second]);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.secure.setItemAsync).toHaveBeenCalledTimes(1);
    expect(getSession()?.accessToken).toBe(authResponse.accessToken);
  });

  it('rejects a malformed response before persisting credentials', async () => {
    const { login, getSession } = await modules();
    mocks.fetch.mockResolvedValueOnce(response({ ...authResponse, refreshToken: '' }));
    await expect(
      login({ email: 'owner@example.test', password: 'Secret123!' }),
    ).rejects.toMatchObject({ status: 503 });
    expect(mocks.secure.setItemAsync).not.toHaveBeenCalled();
    expect(mocks.credentials.get(refreshKey)).toBe('original-refresh-token');
    expect(getSession()).toBeNull();
    expect(mocks.diagnostic).toHaveBeenCalledWith(
      'http://localhost:5000/auth/native/login',
      'invalid-response',
      200,
    );
  });

  it.each(['login', 'signup'] as const)(
    'reports an unreachable account server during %s without exposing credentials',
    async (action) => {
      const auth = await modules();
      const input = {
        email: 'owner@example.test',
        password: 'Secret123!',
        name: 'Owner',
        confirmPassword: 'Secret123!',
      };
      mocks.fetch.mockRejectedValueOnce(new TypeError(`Failed to fetch: ${input.password}`));
      await expect(auth[action](input)).rejects.toMatchObject({
        status: 0,
        reason: 'network-unreachable',
        message: 'Cannot connect to Vetify. Check your connection and try again.',
      });
      expect(mocks.diagnostic).toHaveBeenCalledExactlyOnceWith(
        `http://localhost:5000/auth/native/${action}`,
        'network-unreachable',
      );
      expect(mocks.secure.setItemAsync).not.toHaveBeenCalled();
      expect(auth.getSession()).toBeNull();
    },
  );

  it('distinguishes a timeout from an unregistered account', async () => {
    const { login } = await modules();
    mocks.fetch.mockRejectedValueOnce(new DOMException('Request timed out', 'TimeoutError'));
    await expect(
      login({ email: 'owner@example.test', password: 'Secret123!' }),
    ).rejects.toMatchObject({
      status: 0,
      reason: 'request-timeout',
      message: 'Vetify is taking too long to respond. Please try again.',
    });
    expect(mocks.diagnostic).toHaveBeenCalledExactlyOnceWith(
      'http://localhost:5000/auth/native/login',
      'request-timeout',
    );
  });

  it.each([
    ['TimeoutError', 'request-timeout'],
    ['TypeError', 'network-unreachable'],
  ])('handles %s while reading the session response body', async (name, reason) => {
    const { login } = await modules();
    const accountResponse = response(authResponse);
    const error = new Error('Response body could not finish');
    error.name = name;
    vi.spyOn(accountResponse, 'json').mockRejectedValueOnce(error);
    mocks.fetch.mockResolvedValueOnce(accountResponse);
    await expect(
      login({ email: 'owner@example.test', password: 'Secret123!' }),
    ).rejects.toMatchObject({ status: 0, reason });
    expect(mocks.secure.setItemAsync).not.toHaveBeenCalled();
    expect(mocks.diagnostic).toHaveBeenCalledExactlyOnceWith(
      'http://localhost:5000/auth/native/login',
      reason,
    );
  });

  it('distinguishes invalid JSON from a transport failure', async () => {
    const { login } = await modules();
    mocks.fetch.mockResolvedValueOnce(new Response('<html>Not an account response</html>'));
    await expect(
      login({ email: 'owner@example.test', password: 'Secret123!' }),
    ).rejects.toMatchObject({ status: 503 });
    expect(mocks.diagnostic).toHaveBeenCalledExactlyOnceWith(
      'http://localhost:5000/auth/native/login',
      'invalid-response',
      200,
    );
    expect(mocks.secure.setItemAsync).not.toHaveBeenCalled();
  });

  it('preserves account errors and logs only the response status', async () => {
    const { signup } = await modules();
    mocks.fetch.mockResolvedValueOnce(
      response({ error: 'Account already exist. Please login', reason: 'account-exists' }, 409),
    );
    await expect(
      signup({
        email: 'owner@example.test',
        password: 'Secret123!',
        confirmPassword: 'Secret123!',
        name: 'Owner',
      }),
    ).rejects.toMatchObject({
      status: 409,
      reason: 'account-exists',
      message: 'Account already exist. Please login',
    });
    expect(mocks.diagnostic).toHaveBeenCalledExactlyOnceWith(
      'http://localhost:5000/auth/native/signup',
      'http-error',
      409,
    );
  });

  it('retains the existing session when the refresh server is unreachable', async () => {
    const { refreshSession, writeSession, getSession } = await modules();
    writeSession(authResponse);
    mocks.fetch.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(refreshSession()).rejects.toMatchObject({
      status: 0,
      reason: 'network-unreachable',
    });
    expect(mocks.credentials.get(refreshKey)).toBe('original-refresh-token');
    expect(getSession()?.user.id).toBe('owner-a');
    expect(mocks.secure.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('propagates credential persistence failure without signing in', async () => {
    const { login, getSession } = await modules();
    mocks.fetch.mockResolvedValueOnce(response(authResponse));
    mocks.secure.setItemAsync.mockRejectedValueOnce(new Error('Secure storage unavailable'));
    await expect(login({ email: 'owner@example.test', password: 'Secret123!' })).rejects.toThrow(
      'Secure storage unavailable',
    );
    expect(mocks.credentials.get(refreshKey)).toBe('original-refresh-token');
    expect(getSession()).toBeNull();
  });

  it('clears the session and credential when the refresh token has expired', async () => {
    const { refreshSession, writeSession, getSession } = await modules();
    writeSession(authResponse);
    mocks.fetch.mockResolvedValueOnce(response({ message: 'Expired refresh token' }, 401));
    await expect(refreshSession()).rejects.toMatchObject({ status: 401 });
    expect(mocks.secure.deleteItemAsync).toHaveBeenCalledWith(refreshKey);
    expect(mocks.credentials.has(refreshKey)).toBe(false);
    expect(getSession()).toBeNull();
  });

  it.each(['login', 'signup'] as const)(
    'supports production %s with credentials',
    async (action) => {
      const auth = await modules();
      vi.stubGlobal('__DEV__', false);
      mocks.fetch.mockResolvedValueOnce(response(authResponse));
      const credentials = { email: 'owner@example.test', password: 'Secret123!' };
      const input =
        action === 'login'
          ? credentials
          : {
              ...credentials,
              name: 'Owner',
              confirmPassword: credentials.password,
            };
      if (action === 'login') await auth.login(credentials);
      else
        await auth.signup({ ...credentials, name: 'Owner', confirmPassword: credentials.password });
      expect(mocks.fetch).toHaveBeenCalledWith(
        `http://localhost:5000/auth/native/${action}`,
        expect.objectContaining({ method: 'POST', body: JSON.stringify(input) }),
      );
      expect(auth.getSession()?.user.id).toBe('owner-a');
      expect(mocks.credentials.get(refreshKey)).toBe(authResponse.refreshToken);
    },
  );

  it('returns to login after a stored demo credential is rejected by the real service', async () => {
    const { refreshSession, getSession } = await modules();
    mocks.fetch.mockResolvedValueOnce(response({ error: 'Invalid refresh token' }, 400));
    await expect(refreshSession()).rejects.toMatchObject({
      status: 401,
      reason: 'session-expired',
    });
    expect(mocks.credentials.has(refreshKey)).toBe(false);
    expect(getSession()).toBeNull();
  });

  it('clears local credentials and owner drafts when the logout request fails', async () => {
    const { logout, writeSession, getSession } = await modules();
    writeSession(authResponse);
    const ownerDraft = 'meal-plan-draft:owner-a:pet-a';
    const otherDraft = 'meal-plan-draft:owner-b:pet-b';
    mocks.drafts.set(ownerDraft, 'owner draft');
    mocks.drafts.set(otherDraft, 'other owner draft');
    mocks.fetch.mockRejectedValueOnce(new Error('Offline'));
    await expect(logout()).rejects.toThrow('Offline');
    expect(getSession()).toBeNull();
    expect(mocks.credentials.has(refreshKey)).toBe(false);
    expect(mocks.drafts.has(ownerDraft)).toBe(false);
    expect(mocks.drafts.get(otherDraft)).toBe('other owner draft');
  });

  it('stores social credentials using the native proof exchange', async () => {
    const { beginSocialLogin, getSession } = await modules();
    const complete = beginSocialLogin();
    mocks.fetch.mockResolvedValueOnce(response(authResponse));
    await complete('social-code', 'proof-verifier');
    expect(mocks.fetch).toHaveBeenCalledWith(
      'http://localhost:5000/auth/native/oauth/exchange',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          code: 'social-code',
          codeVerifier: 'proof-verifier',
          clientId: 'vetify-meal-planner',
          redirectUri: 'vetify-planner://auth/social',
        }),
      }),
    );
    expect(getSession()?.user.id).toBe(authResponse.user.id);
    expect(mocks.credentials.get(refreshKey)).toBe(authResponse.refreshToken);
  });

  it('does not complete a browser login after logout changes the session', async () => {
    const { beginSocialLogin, logout, getSession } = await modules();
    const complete = beginSocialLogin();
    mocks.fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await logout();
    await expect(complete('social-code', 'proof-verifier')).rejects.toMatchObject({ status: 401 });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.secure.setItemAsync).not.toHaveBeenCalled();
    expect(mocks.credentials.has(refreshKey)).toBe(false);
    expect(getSession()).toBeNull();
  });
});
