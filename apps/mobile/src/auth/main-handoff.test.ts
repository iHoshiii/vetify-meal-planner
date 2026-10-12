import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  credentials: new Map<string, string>(),
  secure: { getItemAsync: vi.fn(), setItemAsync: vi.fn(), deleteItemAsync: vi.fn() },
  fetch: vi.fn(),
}));
vi.mock('expo-secure-store', () => mocks.secure);
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {} }));
vi.mock('../config', () => ({ serverUrls: () => ({ main: 'https://main.example/api/v1' }) }));
vi.mock('./auth-diagnostics', () => ({ reportAuthFailure: vi.fn() }));

const refreshKey = 'vetify.remembered-refresh-token';
const oldSession = {
  accessToken: 'old-access',
  user: { id: 'owner-a', name: 'Owner A', email: 'a@example.test', role: 'user' },
};
const nextSession = {
  accessToken: 'main-issued-access',
  refreshToken: 'main-issued-refresh',
  user: { id: 'owner-b', name: 'Owner B', email: 'b@example.test', role: 'user' },
};
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const modules = async () => ({ ...(await import('./main-auth')), ...(await import('./session')) });

describe('main account QR handoff', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    vi.stubGlobal('__DEV__', false);
    vi.stubGlobal('fetch', mocks.fetch);
    mocks.credentials.clear();
    mocks.credentials.set(refreshKey, 'old-refresh');
    mocks.secure.getItemAsync.mockImplementation(async (key: string) => mocks.credentials.get(key));
    mocks.secure.setItemAsync.mockImplementation(async (key: string, value: string) => {
      mocks.credentials.set(key, value);
    });
    mocks.secure.deleteItemAsync.mockImplementation(async (key: string) => {
      mocks.credentials.delete(key);
    });
  });

  it('uses main-issued credentials in production without a planner password', async () => {
    const { exchangeMainCode, writeSession, getSession } = await modules();
    writeSession(oldSession);
    mocks.fetch.mockResolvedValueOnce(response(nextSession));
    await exchangeMainCode('one-use-code');
    expect(mocks.fetch).toHaveBeenCalledWith(
      'https://main.example/api/v1/auth/native/exchange',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          code: 'one-use-code',
          clientId: 'vetify-meal-planner',
          redirectUri: 'vetify-planner://auth/callback',
        }),
      }),
    );
    expect(getSession()?.user.id).toBe('owner-b');
    expect(mocks.credentials.has(refreshKey)).toBe(false);
  });

  it('clears the previous identity when an expired connection code is rejected', async () => {
    const { exchangeMainCode, writeSession, getSession } = await modules();
    writeSession(oldSession);
    mocks.fetch.mockResolvedValueOnce(response({ error: 'Connection code expired' }, 401));
    await expect(exchangeMainCode('expired-code')).rejects.toMatchObject({ status: 401 });
    expect(getSession()).toBeNull();
    expect(mocks.credentials.has(refreshKey)).toBe(false);
  });

  it('does not let an earlier refresh replace the newly connected account', async () => {
    const { refreshSession, exchangeMainCode, writeSession, getSession } = await modules();
    writeSession(oldSession);
    let finish!: (value: Response) => void;
    mocks.fetch
      .mockImplementationOnce(() => new Promise<Response>((resolve) => (finish = resolve)))
      .mockResolvedValueOnce(response(nextSession));
    const refresh = refreshSession();
    const rejected = expect(refresh).rejects.toMatchObject({ status: 401 });
    await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    await exchangeMainCode('new-account-code');
    finish(response({ ...oldSession, refreshToken: 'late-old-refresh' }));
    await rejected;
    expect(getSession()?.user.id).toBe('owner-b');
    expect(mocks.credentials.has(refreshKey)).toBe(false);
  });
});
