import { introspectionSchema, type Introspection } from '@vetify/planner-shared/core-contract';
import type { RequestHandler } from 'express';
import { createHash } from 'node:crypto';
import type { ApiConfig } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

declare module 'express-serve-static-core' {
  interface Request {
    currentPrincipal?: Introspection;
  }
}

type CacheEntry = { principal: Introspection; expiresAt: number };
export type Fetcher = typeof fetch;
const unavailable = () =>
  new AppError(503, 'Account service is unavailable. Please retry.', 'main-unavailable');

function validatePrincipal(value: unknown): Introspection {
  const parsed = introspectionSchema.safeParse(value);
  if (!parsed.success) throw unavailable();
  const principal = parsed.data;
  const now = Date.now();
  const tokenExpiry = Date.parse(principal.tokenExpiresAt);
  const validUntil = Date.parse(principal.validUntil);
  if (!Number.isFinite(tokenExpiry) || !Number.isFinite(validUntil)) throw unavailable();
  if (tokenExpiry <= now)
    throw AppError.unauthorized('Your session expired. Please sign in again.');
  if (validUntil <= now || validUntil > tokenExpiry) throw unavailable();
  try {
    new Intl.DateTimeFormat('en', { timeZone: principal.region.timeZone });
  } catch {
    throw unavailable();
  }
  if (principal.user.status !== 'active') {
    throw new AppError(403, 'This account cannot access the planner.', 'account-blocked');
  }
  if (principal.subscription.expiresAt) {
    const boundary = Date.parse(principal.subscription.expiresAt);
    if (!Number.isFinite(boundary)) throw unavailable();
    if (principal.subscription.status === 'active' && validUntil > boundary) throw unavailable();
  }
  return principal;
}

export function createIntrospector(config: ApiConfig, fetcher: Fetcher = fetch) {
  const cache = new Map<string, CacheEntry>();
  const inFlight = new Map<string, Promise<Introspection>>();
  async function retrieve(token: string): Promise<Introspection> {
    try {
      const response = await fetcher(`${config.MAIN_API_URL.replace(/\/$/, '')}/auth/introspect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(config.INTROSPECTION_TIMEOUT_MS),
        redirect: 'error',
      });
      if (response.status === 401) throw AppError.unauthorized();
      if (response.status === 403) {
        throw new AppError(403, 'This account cannot access the planner.', 'account-blocked');
      }
      if (!response.ok) throw unavailable();
      return validatePrincipal(await response.json());
    } catch (cause) {
      if (cause instanceof AppError) throw cause;
      throw unavailable();
    }
  }
  return async (token: string): Promise<Introspection> => {
    const key = createHash('sha256').update(token).digest('hex');
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.principal;
    cache.delete(key);
    const pending = inFlight.get(key);
    if (pending) return pending;
    const request = retrieve(token)
      .then((principal) => {
        const expiresAt = Math.min(
          Date.now() + config.AUTH_CACHE_TTL_SECONDS * 1000,
          Date.parse(principal.validUntil),
          Date.parse(principal.tokenExpiresAt),
        );
        if (expiresAt > Date.now()) {
          if (cache.size >= 1000) cache.delete(cache.keys().next().value as string);
          cache.set(key, { principal, expiresAt });
        }
        return principal;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, request);
    return request;
  };
}

export function createAuthorize(config: ApiConfig, fetcher: Fetcher = fetch): RequestHandler {
  const introspect = createIntrospector(config, fetcher);
  return async (req, _res, next) => {
    try {
      const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '');
      if (!match) throw AppError.unauthorized();
      req.currentPrincipal = await introspect(match[1]);
      next();
    } catch (cause) {
      next(cause);
    }
  };
}

export function requireEntitlement(capability: string): RequestHandler {
  return (req, _res, next) => {
    if (!req.currentPrincipal) return next(AppError.unauthorized());
    if (!req.currentPrincipal.entitlements.includes(capability)) {
      return next(
        new AppError(403, 'Your account does not include this capability.', 'missing-entitlement'),
      );
    }
    next();
  };
}
