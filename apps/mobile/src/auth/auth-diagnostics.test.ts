import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Module from 'node:module';
import { reportAuthFailure } from './auth-diagnostics';

const mocks = vi.hoisted(() => ({
  platform: { OS: 'android' },
  bridge: { log: vi.fn() },
  require: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock('react-native', () => ({ Platform: mocks.platform }));

type RuntimeConsole = typeof console & { _isPolyfilled?: boolean };
const moduleLoader = Module as unknown as {
  _load: (request: string, ...args: unknown[]) => unknown;
};
const originalLoad = moduleLoader._load;

describe('development account diagnostics', () => {
  const originalPolyfilled = (console as RuntimeConsole)._isPolyfilled;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('__DEV__', true);
    vi.stubGlobal('fetch', mocks.fetch);
    mocks.fetch.mockResolvedValue({ status: 200 });
    mocks.require.mockReturnValue({ default: mocks.bridge });
    vi.spyOn(moduleLoader, '_load').mockImplementation((request, ...args) => {
      if (request === 'expo/src/async-require/hmr') return mocks.require(request);
      return Reflect.apply(originalLoad, Module, [request, ...args]);
    });
    mocks.platform.OS = 'android';
    (console as RuntimeConsole)._isPolyfilled = false;
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    if (originalPolyfilled === undefined) delete (console as RuntimeConsole)._isPolyfilled;
    else (console as RuntimeConsole)._isPolyfilled = originalPolyfilled;
  });

  it('removes credentials, query parameters, and fragments before logging or forwarding', () => {
    reportAuthFailure(
      'https://owner:secret@api.example.test/api/v1/auth/native/login?token=private#password',
      'network-unreachable',
    );
    const message =
      '[auth] network-unreachable at https://api.example.test/api/v1/auth/native/login';
    expect(console.info).toHaveBeenCalledExactlyOnceWith(message);
    expect(mocks.require).toHaveBeenCalledExactlyOnceWith('expo/src/async-require/hmr');
    expect(mocks.bridge.log).toHaveBeenCalledExactlyOnceWith('info', [message]);
    expect(mocks.fetch).toHaveBeenCalledExactlyOnceWith(
      'https://api.example.test/api/v1/health',
      expect.objectContaining({
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('does not load the native bridge or emit logs in production', () => {
    vi.stubGlobal('__DEV__', false);
    reportAuthFailure('http://localhost:8000/api/v1/auth/native/login', 'request-timeout');
    expect(console.info).not.toHaveBeenCalled();
    expect(mocks.require).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it.each(['web', 'polyfilled'])('avoids a second forwarding path for %s consoles', (runtime) => {
    mocks.platform.OS = runtime === 'web' ? 'web' : 'android';
    (console as RuntimeConsole)._isPolyfilled = runtime === 'polyfilled';
    reportAuthFailure('http://localhost:8000/api/v1/auth/native/login', 'http-error', 503);
    expect(console.info).toHaveBeenCalledExactlyOnceWith(
      '[auth] http-error (HTTP 503) at http://localhost:8000/api/v1/auth/native/login',
    );
    expect(mocks.require).not.toHaveBeenCalled();
  });

  it.each(['not a URL with a secret', 'data:secret', 'file:///secret'])(
    'replaces invalid or unsupported endpoints with a fixed marker',
    (endpoint) => {
      reportAuthFailure(endpoint, 'invalid-response');
      expect(console.info).toHaveBeenCalledExactlyOnceWith(
        '[auth] invalid-response at [unavailable endpoint]',
      );
    },
  );

  it('keeps login failure handling intact when the development bridge is unavailable', () => {
    mocks.require.mockImplementation(() => {
      throw new Error('No HMR client');
    });
    expect(() =>
      reportAuthFailure('http://localhost:8000/api/v1/auth/native/login', 'request-timeout'),
    ).not.toThrow();
    expect(console.info).toHaveBeenCalledOnce();
  });

  it('still forwards a safe diagnostic if the console writer fails', () => {
    vi.mocked(console.info).mockImplementation(() => {
      throw new Error('Console unavailable');
    });
    expect(() =>
      reportAuthFailure('http://localhost:8000/api/v1', 'http-error', 400),
    ).not.toThrow();
    expect(mocks.bridge.log).toHaveBeenCalledExactlyOnceWith('info', [
      '[auth] http-error (HTTP 400) at http://localhost:8000/api/v1',
    ]);
  });

  it.each(['http-error', 'invalid-response'] as const)(
    'does not probe for %s failures',
    (failure) => {
      reportAuthFailure('http://localhost:8000/api/v1/auth/native/login', failure, 503);
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );

  it.each([
    'not a URL',
    'file:///api/v1/auth/native/login',
    'https://api.example.test/api/v1/auth/native/unknown',
    'https://api.example.test/api/v1/pets',
    'https://api.example.test/api/v1/auth/native/login/extra',
  ])('does not derive a health URL from unsupported endpoints: %s', (endpoint) => {
    reportAuthFailure(endpoint, 'network-unreachable');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('reports a reachable server without reading or logging the response body', async () => {
    const json = vi.fn(() => ({ password: 'private-password', token: 'private-token' }));
    mocks.fetch.mockResolvedValue({ status: 503, json });
    reportAuthFailure('http://localhost:8000/api/v1/auth/native/signup', 'request-timeout');
    await vi.waitFor(() => {
      expect(console.info).toHaveBeenCalledWith(
        '[auth] health reachable (HTTP 503) at http://localhost:8000/api/v1/health',
      );
    });
    expect(json).not.toHaveBeenCalled();
    expect(mocks.bridge.log).toHaveBeenCalledWith('info', [
      '[auth] health reachable (HTTP 503) at http://localhost:8000/api/v1/health',
    ]);
    expect(mocks.fetch.mock.calls[0][1]).not.toHaveProperty('body');
  });

  it('reports network failure without logging raw errors', async () => {
    mocks.fetch.mockRejectedValue(new Error('secret password and token'));
    reportAuthFailure('http://localhost:8000/api/v1/auth/native/login', 'network-unreachable');
    await vi.waitFor(() => {
      expect(console.info).toHaveBeenCalledWith(
        '[auth] health network-unreachable at http://localhost:8000/api/v1/health',
      );
    });
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain('secret');
    expect(JSON.stringify(mocks.bridge.log.mock.calls)).not.toContain('secret');
  });

  it('aborts and reports after four seconds even if fetch ignores its signal', async () => {
    vi.useFakeTimers();
    mocks.fetch.mockImplementation(() => new Promise(() => {}));
    reportAuthFailure('http://localhost:8000/api/v1/auth/native/login', 'request-timeout');
    const signal = mocks.fetch.mock.calls[0][1].signal as AbortSignal;
    await vi.advanceTimersByTimeAsync(3999);
    expect(signal.aborted).toBe(false);
    expect(console.info).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(signal.aborted).toBe(true);
    expect(console.info).toHaveBeenCalledWith(
      '[auth] health request-timeout at http://localhost:8000/api/v1/health',
    );
  });

  it('deduplicates simultaneous probes and allows another after completion', async () => {
    let finish!: (response: { status: number }) => void;
    mocks.fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    reportAuthFailure('http://localhost:8000/api/v1/auth/native/login', 'request-timeout');
    reportAuthFailure('http://localhost:8000/api/v1/auth/native/signup', 'network-unreachable');
    expect(mocks.fetch).toHaveBeenCalledOnce();
    finish({ status: 200 });
    await vi.waitFor(() => {
      expect(console.info).toHaveBeenCalledWith(
        '[auth] health reachable (HTTP 200) at http://localhost:8000/api/v1/health',
      );
    });
    reportAuthFailure('http://localhost:8000/api/v1/auth/native/refresh', 'request-timeout');
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
});
