// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Introspection } from '@vetify/planner-shared/core-contract';

const runtime = vi.hoisted(() => ({
  ownerId: 'owner',
  fetch: vi.fn(),
  setTimeZone: vi.fn(),
  listeners: new Set<(state: string) => void>(),
}));
vi.mock('react-native', () => ({
  AppState: {
    addEventListener: (_event: string, listener: (state: string) => void) => {
      runtime.listeners.add(listener);
      return { remove: () => runtime.listeners.delete(listener) };
    },
  },
}));
vi.mock('../services/api', async () => ({
  apiFetch: runtime.fetch,
  ...(await import('../services/api-error')),
}));
vi.mock('./session', () => ({
  getSession: () => ({ user: { id: runtime.ownerId } }),
  setAccountTimeZone: runtime.setTimeZone,
}));
import { usePrincipalRefresh } from './use-principal-refresh';
import { accountPlanLabel } from './principal-refresh';

function principal(ownerId = 'owner', pro = false): Introspection {
  return {
    version: 1,
    user: { id: ownerId, role: 'user', status: 'active' },
    region: { timeZone: 'Asia/Manila' },
    subscription: { plan: pro ? 'pro' : 'free', status: pro ? 'active' : null, expiresAt: null },
    entitlements: [],
    validUntil: new Date(Date.now() + 30000).toISOString(),
    tokenExpiresAt: new Date(Date.now() + 120000).toISOString(),
  };
}
function resume() {
  act(() => runtime.listeners.forEach((listener) => listener('active')));
}
beforeEach(() => {
  runtime.ownerId = 'owner';
  runtime.fetch.mockReset();
  runtime.setTimeZone.mockReset();
});
afterEach(() => {
  cleanup();
  runtime.listeners.clear();
});

it('refreshes the shared plan on resume and keeps the hook mounted', async () => {
  const initial = principal();
  const refusal = vi.fn();
  const { result } = renderHook(() => usePrincipalRefresh(initial, true, refusal));
  expect(accountPlanLabel(result.current!)).toBe('Free');
  runtime.fetch.mockResolvedValue(principal('owner', true));
  resume();
  await act(async () => {});
  expect(runtime.fetch).toHaveBeenCalledExactlyOnceWith('/session', {
    signal: expect.any(AbortSignal),
  });
  expect(accountPlanLabel(result.current!)).toBe('Pro');
  expect(runtime.listeners.size).toBe(1);
  expect(refusal).not.toHaveBeenCalled();
});

it('deduplicates repeated resume events and removes the listener on unmount', async () => {
  const initial = principal();
  const refusal = vi.fn();
  let signal!: AbortSignal;
  runtime.fetch.mockImplementation((_path, options: { signal: AbortSignal }) => {
    signal = options.signal;
    return new Promise(() => {});
  });
  const { unmount } = renderHook(() => usePrincipalRefresh(initial, true, refusal));
  resume();
  resume();
  await act(async () => {});
  expect(runtime.fetch).toHaveBeenCalledOnce();
  unmount();
  expect(signal.aborted).toBe(true);
  expect(runtime.listeners.size).toBe(0);
});

it('replaces identity-scoped refresh work when another account signs in', async () => {
  let resolve!: (value: Introspection) => void;
  runtime.fetch.mockReturnValue(
    new Promise<Introspection>((accept) => {
      resolve = accept;
    }),
  );
  const refusal = vi.fn();
  const { result, rerender } = renderHook(
    ({ initial }) => usePrincipalRefresh(initial, true, refusal),
    { initialProps: { initial: principal() } },
  );
  resume();
  await act(async () => {});
  const oldSignal = runtime.fetch.mock.calls[0][1].signal as AbortSignal;
  runtime.ownerId = 'second-owner';
  rerender({ initial: principal('second-owner') });
  expect(oldSignal.aborted).toBe(true);
  await act(async () => resolve(principal('owner', true)));
  expect(result.current?.principal.user.id).toBe('second-owner');
  expect(accountPlanLabel(result.current!)).toBe('Free');
  expect(runtime.listeners.size).toBe(1);
});
