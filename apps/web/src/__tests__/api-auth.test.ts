import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/services/api';
import { refreshSession } from '@/auth/main-auth';
import {
  accountToday,
  clearDrafts,
  draftKey,
  getSession,
  setAccountTimeZone,
  writeSession,
} from '@/auth/session';

const user = { id: 'owner-one', name: 'Owner', email: 'owner@example.test', role: 'user' };
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
describe('separate planner and account requests', () => {
  beforeEach(() => {
    writeSession(null);
    sessionStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    writeSession(null);
  });

  it('refreshes without stored user and keeps its token in memory', async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ accessToken: 'fresh', user }));
    vi.stubGlobal('fetch', fetcher);
    await refreshSession();
    expect(fetcher).toHaveBeenCalledWith('/main-api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    expect(getSession()?.accessToken).toBe('fresh');
    expect(localStorage.length).toBe(0);
  });

  it('accepts a valid main session without a profile name', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json({ accessToken: 'fresh', user: { ...user, name: null } })),
    );
    await refreshSession();
    expect(getSession()?.user).toEqual({ ...user, name: null });
  });

  it('shares refresh across concurrent expired requests and replays each once', async () => {
    writeSession({ accessToken: 'old', user });
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetcher = vi.fn(async (url: string, options: RequestInit) => {
      if (url.includes('/auth/refresh')) {
        await gate;
        return json({ accessToken: 'fresh', user });
      }
      const token = new Headers(options.headers).get('Authorization');
      return token === 'Bearer old' ? json({ error: 'Expired' }, 401) : json({ ok: true });
    });
    vi.stubGlobal('fetch', fetcher);
    const requests = Promise.all([apiFetch('/pets'), apiFetch('/meal-plans')]);
    await vi.waitFor(() =>
      expect(fetcher.mock.calls.filter(([url]) => url.includes('/auth/refresh'))).toHaveLength(1),
    );
    release!();
    await requests;
    expect(fetcher.mock.calls.filter(([url]) => url.startsWith('/api/v1/'))).toHaveLength(4);
    expect(
      fetcher.mock.calls
        .filter(([url]) => url.startsWith('/api/v1/'))
        .every(([, options]) => options.credentials === 'omit'),
    ).toBe(true);
  });

  it.each([403, 503])('preserves a session and reason on HTTP %s', async (status) => {
    writeSession({ accessToken: 'valid', user });
    const fetcher = vi
      .fn()
      .mockResolvedValue(json({ error: 'Unavailable', reason: 'capability_denied' }, status));
    vi.stubGlobal('fetch', fetcher);
    await expect(apiFetch('/pets')).rejects.toMatchObject({ status, reason: 'capability_denied' });
    expect(getSession()?.accessToken).toBe('valid');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not recursively refresh when replay is also unauthorized', async () => {
    const fetcher = vi.fn(async (url: string) =>
      url.includes('/auth/refresh')
        ? json({ accessToken: 'fresh', user })
        : json({ error: 'Unauthorized' }, 401),
    );
    vi.stubGlobal('fetch', fetcher);
    await expect(apiFetch('/pets')).rejects.toMatchObject({ status: 401 });
    expect(fetcher.mock.calls.filter(([url]) => url.includes('/auth/refresh'))).toHaveLength(1);
  });

  it('scopes drafts and clears them at owner transitions', () => {
    writeSession({ accessToken: 'one', user });
    sessionStorage.setItem(draftKey('pet-one'), '{}');
    expect(draftKey('pet-one')).toContain('owner-one');
    writeSession({ accessToken: 'two', user: { ...user, id: 'owner-two' } });
    expect(sessionStorage.length).toBe(0);
    expect(draftKey('pet-one')).toContain('owner-two');
    sessionStorage.setItem(draftKey('pet-two'), '{}');
    clearDrafts();
    expect(sessionStorage.length).toBe(0);
  });
  it('uses the account timezone for calendar-day boundaries', () => {
    writeSession({ accessToken: 'one', user });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T00:30:00.000Z'));
    setAccountTimeZone('America/Los_Angeles');
    expect(accountToday()).toBe('2026-10-06');
    setAccountTimeZone('Asia/Manila');
    expect(accountToday()).toBe('2026-10-07');
  });
});
