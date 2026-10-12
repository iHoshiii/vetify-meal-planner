import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Introspection } from '@vetify/planner-shared/core-contract';
import { ApiError } from '../services/api-error';
import {
  accountPlanLabel,
  createPrincipalRefresh,
  validateAccountPrincipal,
  type PrincipalSnapshot,
} from './principal-refresh';

function principal(
  settings: { pro?: boolean; ttl?: number; ownerId?: string } = {},
): Introspection {
  return {
    version: 1,
    user: { id: settings.ownerId ?? 'owner', role: 'user', status: 'active' },
    region: { timeZone: 'Asia/Manila' },
    subscription: {
      plan: settings.pro ? 'pro' : 'free',
      status: settings.pro ? 'active' : null,
      expiresAt: settings.pro ? new Date(Date.now() + 60000).toISOString() : null,
    },
    entitlements: [],
    tokenExpiresAt: new Date(Date.now() + 120000).toISOString(),
    validUntil: new Date(Date.now() + (settings.ttl ?? 30000)).toISOString(),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

function setup(initial = principal({ pro: true })) {
  let snapshot: PrincipalSnapshot = { principal: initial, status: 'verified' };
  let ownerId = initial.user.id;
  const load = vi.fn<(signal: AbortSignal) => Promise<unknown>>();
  const onRefusal = vi.fn();
  const refresh = createPrincipalRefresh({
    initial,
    load,
    isCurrentOwner: () => ownerId === initial.user.id,
    onChange: (next) => {
      snapshot = next;
    },
    onRefusal,
  });
  return {
    ...refresh,
    load,
    onRefusal,
    snapshot: () => snapshot,
    label: () => accountPlanLabel(snapshot),
    switchOwner: () => {
      ownerId = 'another-owner';
    },
  };
}

describe('shared account subscription refresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T00:00:00Z'));
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('applies a main-system upgrade to the same account', async () => {
    const current = setup(principal());
    expect(current.label()).toBe('Free');
    const upgraded = principal({ pro: true });
    current.load.mockResolvedValue(upgraded);
    await current.refresh();
    expect(current.snapshot().principal).toEqual(upgraded);
    expect(current.label()).toBe('Pro');
    current.dispose();
  });

  it('updates an expired authorization without keeping an old Pro label', async () => {
    const current = setup();
    current.load.mockImplementation(async () => principal());
    await vi.advanceTimersByTimeAsync(30000);
    expect(current.load).toHaveBeenCalledOnce();
    expect(current.label()).toBe('Free');
    current.dispose();
  });

  it('hides Pro at the validity boundary even while a resume check is pending', async () => {
    const current = setup(principal({ pro: true, ttl: 5000 }));
    const response = deferred<Introspection>();
    current.load.mockReturnValue(response.promise);
    const request = current.refresh();
    await vi.advanceTimersByTimeAsync(5000);
    expect(current.load).toHaveBeenCalledOnce();
    expect(current.label()).toBe('Checking plan…');
    response.resolve(principal());
    await request;
    expect(current.label()).toBe('Free');
    current.dispose();
  });

  it('also caps display at an active subscription expiry', async () => {
    const initial = principal({ pro: true });
    initial.subscription.expiresAt = new Date(Date.now() + 5000).toISOString();
    const current = setup(initial);
    current.load.mockRejectedValue(new Error('Offline'));
    await vi.advanceTimersByTimeAsync(5000);
    expect(current.label()).toBe('Plan unavailable');
    expect(current.load).toHaveBeenCalledOnce();
    current.dispose();
  });

  it('retries an outage at a bounded interval and recovers authoritative state', async () => {
    const current = setup();
    current.load.mockRejectedValue(new Error('Offline'));
    await vi.advanceTimersByTimeAsync(30000);
    expect(current.label()).toBe('Plan unavailable');
    await vi.advanceTimersByTimeAsync(9999);
    expect(current.load).toHaveBeenCalledOnce();
    current.load.mockImplementation(async () => principal());
    await vi.advanceTimersByTimeAsync(1);
    expect(current.load).toHaveBeenCalledTimes(2);
    expect(current.label()).toBe('Free');
    current.dispose();
  });

  it('does not repeatedly accept or immediately retry an expired service response', async () => {
    const initial = principal({ pro: true, ttl: 1 });
    const current = setup(initial);
    current.load.mockResolvedValue(initial);
    await vi.advanceTimersByTimeAsync(1);
    expect(current.label()).toBe('Plan unavailable');
    await vi.advanceTimersByTimeAsync(9999);
    expect(current.load).toHaveBeenCalledOnce();
    current.dispose();
  });

  it('deduplicates overlapping resume and validity checks', async () => {
    const current = setup(principal({ pro: true, ttl: 5000 }));
    const response = deferred<Introspection>();
    current.load.mockReturnValue(response.promise);
    const first = current.refresh();
    const second = current.refresh();
    expect(first).toBe(second);
    await vi.advanceTimersByTimeAsync(5000);
    expect(current.load).toHaveBeenCalledOnce();
    response.resolve(principal());
    await first;
    current.dispose();
  });

  it('aborts unmount work and ignores its late response', async () => {
    const current = setup();
    const response = deferred<Introspection>();
    current.load.mockReturnValue(response.promise);
    const request = current.refresh();
    await Promise.resolve();
    const signal = current.load.mock.calls[0][0];
    current.dispose();
    expect(signal.aborted).toBe(true);
    response.resolve(principal());
    await request;
    expect(current.snapshot().principal.subscription.plan).toBe('pro');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('discards a response after the account changes', async () => {
    const current = setup();
    const response = deferred<Introspection>();
    current.load.mockReturnValue(response.promise);
    const request = current.refresh();
    current.switchOwner();
    response.resolve(principal());
    await request;
    expect(current.snapshot().principal.subscription.plan).toBe('pro');
    expect(vi.getTimerCount()).toBe(0);
    await current.refresh();
    expect(current.load).toHaveBeenCalledOnce();
    current.dispose();
  });

  it('rejects another account instead of replacing the current principal', async () => {
    const current = setup();
    current.load.mockResolvedValue(principal({ ownerId: 'someone-else' }));
    await current.refresh();
    expect(current.snapshot().principal.user.id).toBe('owner');
    expect(current.onRefusal).not.toHaveBeenCalled();
    current.dispose();
  });

  it('retries a request deadline reported as a synthetic 401 without refusing the account', async () => {
    const current = setup(principal({ pro: true, ttl: 5000 }));
    current.load.mockImplementation(
      (signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () =>
            reject(new ApiError(401, 'The account session changed.')),
          );
        }),
    );
    const request = current.refresh();
    await vi.advanceTimersByTimeAsync(15000);
    await request;
    expect(current.label()).toBe('Plan unavailable');
    expect(current.onRefusal).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(9999);
    expect(current.load).toHaveBeenCalledOnce();
    current.load.mockImplementation(async () => principal({ pro: true }));
    await vi.advanceTimersByTimeAsync(1);
    expect(current.load).toHaveBeenCalledTimes(2);
    expect(current.label()).toBe('Pro');
    expect(current.onRefusal).not.toHaveBeenCalled();
    current.dispose();
  });

  it.each([401, 403])('stops refreshing when main refuses access with %s', async (status) => {
    const current = setup();
    const error = new ApiError(status, 'Access refused.');
    current.load.mockRejectedValue(error);
    await current.refresh();
    expect(current.onRefusal).toHaveBeenCalledExactlyOnceWith(error);
    expect(vi.getTimerCount()).toBe(0);
    await current.refresh();
    expect(current.load).toHaveBeenCalledOnce();
    current.dispose();
  });

  it('validates account status, ownership, and subscription payloads', () => {
    const blocked = principal();
    blocked.user.status = 'suspended';
    expect(() => validateAccountPrincipal(blocked, 'owner')).toThrow(ApiError);
    expect(() => validateAccountPrincipal(principal(), 'another-owner')).toThrow(ApiError);
    expect(() => validateAccountPrincipal({ ...principal(), subscription: null }, 'owner')).toThrow(
      ApiError,
    );
  });
});
