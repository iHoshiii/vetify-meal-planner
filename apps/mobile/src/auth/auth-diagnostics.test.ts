import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Module from 'node:module';
import { reportAuthFailure } from './auth-diagnostics';

const mocks = vi.hoisted(() => ({
  platform: { OS: 'android' },
  bridge: { log: vi.fn() },
  require: vi.fn(),
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
    mocks.require.mockReturnValue({ default: mocks.bridge });
    vi.spyOn(moduleLoader, '_load').mockImplementation((request, ...args) => {
      if (request === 'react-native/Libraries/Utilities/HMRClient') return mocks.require(request);
      return Reflect.apply(originalLoad, Module, [request, ...args]);
    });
    mocks.platform.OS = 'android';
    (console as RuntimeConsole)._isPolyfilled = false;
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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
    expect(mocks.require).toHaveBeenCalledExactlyOnceWith(
      'react-native/Libraries/Utilities/HMRClient',
    );
    expect(mocks.bridge.log).toHaveBeenCalledExactlyOnceWith('info', [message]);
  });

  it('does not load the native bridge or emit logs in production', () => {
    vi.stubGlobal('__DEV__', false);
    reportAuthFailure('http://localhost:8000/api/v1/auth/native/login', 'http-error', 401);
    expect(console.info).not.toHaveBeenCalled();
    expect(mocks.require).not.toHaveBeenCalled();
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
});
