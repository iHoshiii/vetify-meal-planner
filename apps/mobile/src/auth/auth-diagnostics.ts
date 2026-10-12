import { Platform } from 'react-native';

type AuthFailure = 'network-unreachable' | 'request-timeout' | 'http-error' | 'invalid-response';
type RuntimeConsole = typeof console & { _isPolyfilled?: boolean };
const healthProbes = new Set<string>();

function safeEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    if (!['http:', 'https:'].includes(url.protocol)) return '[unavailable endpoint]';
    return `${url.origin}${url.pathname}`;
  } catch {
    return '[unavailable endpoint]';
  }
}

function writeDiagnostic(message: string) {
  try {
    console.info(message);
  } catch {
    // Diagnostics must not change the account request outcome.
  }
  try {
    if (Platform.OS !== 'web' && !(console as RuntimeConsole)._isPolyfilled) {
      // Use Expo's active HMR client without importing deprecated React Native internals.
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- Load the Expo bridge only in development.
      const { default: hmrClient } = require('expo/src/async-require/hmr') as {
        default: { log: (level: string, data: string[]) => void };
      };
      hmrClient.log('info', [message]);
    }
  } catch {
    // An unavailable development socket must not cause another app error.
  }
}

function healthEndpoint(endpoint: string) {
  try {
    const url = new URL(safeEndpoint(endpoint));
    const base = url.pathname.match(
      /^(.*)\/auth\/native\/(login|signup|refresh|exchange|oauth\/exchange|logout)$/,
    )?.[1];
    return base === undefined ? null : `${url.origin}${base}/health`;
  } catch {
    return null;
  }
}

async function probeHealth(endpoint: string) {
  if (healthProbes.has(endpoint)) return;
  healthProbes.add(endpoint);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  try {
    const controller = new AbortController();
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
        reject(new Error('Health probe timed out'));
      }, 4000);
    });
    const response = await Promise.race([
      fetch(endpoint, {
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      }),
      deadline,
    ]);
    writeDiagnostic(`[auth] health reachable (HTTP ${response.status}) at ${endpoint}`);
  } catch (error) {
    const failure =
      timedOut || (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name))
        ? 'request-timeout'
        : 'network-unreachable';
    writeDiagnostic(`[auth] health ${failure} at ${endpoint}`);
  } finally {
    clearTimeout(timer);
    healthProbes.delete(endpoint);
  }
}

export function reportAuthFailure(endpoint: string, failure: AuthFailure, status?: number) {
  if (!__DEV__) return;
  const httpStatus =
    typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599
      ? ` (HTTP ${status})`
      : '';
  writeDiagnostic(`[auth] ${failure}${httpStatus} at ${safeEndpoint(endpoint)}`);
  if (failure === 'network-unreachable' || failure === 'request-timeout') {
    const health = healthEndpoint(endpoint);
    if (health) void probeHealth(health).catch(() => {});
  }
}
