import { Platform } from 'react-native';

type AuthFailure = 'network-unreachable' | 'request-timeout' | 'http-error' | 'invalid-response';
type RuntimeConsole = typeof console & { _isPolyfilled?: boolean };

function safeEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    if (!['http:', 'https:'].includes(url.protocol)) return '[unavailable endpoint]';
    return `${url.origin}${url.pathname}`;
  } catch {
    return '[unavailable endpoint]';
  }
}

export function reportAuthFailure(endpoint: string, failure: AuthFailure, status?: number) {
  if (!__DEV__) return;
  const httpStatus =
    typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599
      ? ` (HTTP ${status})`
      : '';
  const message = `[auth] ${failure}${httpStatus} at ${safeEndpoint(endpoint)}`;
  try {
    console.info(message);
  } catch {
    // Diagnostics must not change the account request outcome.
  }
  try {
    if (Platform.OS !== 'web' && !(console as RuntimeConsole)._isPolyfilled) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- Load the native bridge only in development.
      const { default: hmrClient } = require('react-native/Libraries/Utilities/HMRClient') as {
        default: { log: (level: string, data: string[]) => void };
      };
      hmrClient.log('info', [message]);
    }
  } catch {
    // An unavailable development socket must not cause another app error.
  }
}
