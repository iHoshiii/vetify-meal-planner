import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  credentials: new Map<string, string>(),
  drafts: new Map<string, string>(),
  secure: { getItemAsync: vi.fn(), setItemAsync: vi.fn(), deleteItemAsync: vi.fn() },
  storage: { getAllKeys: vi.fn(), removeItem: vi.fn() },
  fetch: vi.fn(),
}));
vi.mock('expo-secure-store', () => mocks.secure);
vi.mock('@react-native-async-storage/async-storage', () => ({ default: mocks.storage }));
vi.mock('../config', () => ({ serverUrls: () => ({ main: 'http://localhost:5000' }) }));

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
    await expect(login('owner-a')).rejects.toMatchObject({ status: 503 });
    expect(mocks.secure.setItemAsync).not.toHaveBeenCalled();
    expect(mocks.credentials.get(refreshKey)).toBe('original-refresh-token');
    expect(getSession()).toBeNull();
  });

  it('propagates credential persistence failure without signing in', async () => {
    const { login, getSession } = await modules();
    mocks.fetch.mockResolvedValueOnce(response(authResponse));
    mocks.secure.setItemAsync.mockRejectedValueOnce(new Error('Secure storage unavailable'));
    await expect(login('owner-a')).rejects.toThrow('Secure storage unavailable');
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
});
