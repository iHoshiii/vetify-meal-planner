// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const linking = vi.hoisted(() => ({
  initial: vi.fn(),
  listeners: new Set<(event: { url: string }) => void>(),
}));
vi.mock('react-native', () => ({
  Linking: {
    getInitialURL: linking.initial,
    addEventListener: (_event: string, listener: (event: { url: string }) => void) => {
      linking.listeners.add(listener);
      return { remove: () => linking.listeners.delete(listener) };
    },
  },
}));
import { useMainAccountLink } from './use-main-account-link';

const callback = (code: string) => `vetify-planner://auth/callback?code=${code}`;
function initialLink() {
  let resolve!: (value: string | null) => void;
  const promise = new Promise<string | null>((accept) => {
    resolve = accept;
  });
  linking.initial.mockReturnValue(promise);
  return { promise, resolve };
}
function open(url: string) {
  act(() => linking.listeners.forEach((listener) => listener({ url })));
}

describe('native account connection links', () => {
  beforeEach(() => {
    linking.initial.mockReset();
    linking.initial.mockResolvedValue(null);
  });
  afterEach(() => {
    cleanup();
    linking.listeners.clear();
  });

  it('waits for the cold-launch link before allowing credential restoration', async () => {
    const initial = initialLink();
    const { result } = renderHook(() => useMainAccountLink());
    expect(result.current).toMatchObject({ ready: false, code: null });
    await act(async () => {
      initial.resolve(callback('cold-code'));
      await initial.promise;
    });
    expect(result.current).toMatchObject({ ready: true, code: 'cold-code' });
  });

  it('keeps a newer warm link when the initial URL arrives later', async () => {
    const initial = initialLink();
    const { result } = renderHook(() => useMainAccountLink());
    open(callback('new-account'));
    expect(result.current).toMatchObject({ ready: true, code: 'new-account' });
    await act(async () => {
      initial.resolve(callback('old-account'));
      await initial.promise;
    });
    expect(result.current.code).toBe('new-account');
  });

  it('does not reapply an already handled code after switching accounts', async () => {
    linking.initial.mockResolvedValue(callback('first-account'));
    const { result } = renderHook(() => useMainAccountLink());
    await waitFor(() => expect(result.current.code).toBe('first-account'));
    open(callback('second-account'));
    open(callback('first-account'));
    expect(result.current.code).toBe('second-account');
  });

  it('ignores unrelated links and removes the listener on unmount', async () => {
    const { result, unmount } = renderHook(() => useMainAccountLink());
    await waitFor(() => expect(result.current.ready).toBe(true));
    open('https://example.com/?code=other');
    expect(result.current.code).toBeNull();
    expect(linking.listeners.size).toBe(1);
    unmount();
    expect(linking.listeners.size).toBe(0);
  });

  it('allows explicit demo login after a handoff while continuing to reject reused codes', async () => {
    linking.initial.mockResolvedValue(callback('expired-code'));
    const { result } = renderHook(() => useMainAccountLink());
    await waitFor(() => expect(result.current.code).toBe('expired-code'));
    act(() => result.current.clearCode('expired-code'));
    expect(result.current.code).toBeNull();
    open(callback('expired-code'));
    expect(result.current.code).toBeNull();
    open(callback('fresh-code'));
    expect(result.current.code).toBe('fresh-code');
  });

  it('preserves a newer QR when an earlier demo sign-in finishes', async () => {
    linking.initial.mockResolvedValue(callback('expired-code'));
    const { result } = renderHook(() => useMainAccountLink());
    await waitFor(() => expect(result.current.code).toBe('expired-code'));
    open(callback('new-code'));
    act(() => result.current.clearCode('expired-code'));
    expect(result.current.code).toBe('new-code');
  });
});
