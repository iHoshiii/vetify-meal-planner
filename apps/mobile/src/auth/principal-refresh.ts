import { introspectionSchema, type Introspection } from '@vetify/planner-shared/core-contract';
import { ApiError } from '../services/api-error';

export type PrincipalSnapshot = {
  principal: Introspection;
  status: 'verified' | 'checking' | 'unavailable';
};

export function validateAccountPrincipal(value: unknown, ownerId: string | undefined) {
  const parsed = introspectionSchema.safeParse(value);
  if (!parsed.success) throw new ApiError(503, 'The planner returned an invalid account session.');
  if (parsed.data.user.status !== 'active')
    throw new ApiError(403, 'This account cannot access the planner.');
  if (parsed.data.user.id !== ownerId)
    throw new ApiError(503, 'The account session changed. Try again.');
  return parsed.data;
}

function validity(principal: Introspection) {
  return Math.min(
    Date.parse(principal.validUntil),
    Date.parse(principal.tokenExpiresAt),
    principal.subscription.status === 'active' && principal.subscription.expiresAt
      ? Date.parse(principal.subscription.expiresAt)
      : Infinity,
  );
}

export function accountPlanLabel(snapshot: PrincipalSnapshot, now = Date.now()) {
  if (validity(snapshot.principal) <= now || snapshot.status !== 'verified')
    return snapshot.status === 'unavailable' ? 'Plan unavailable' : 'Checking plan…';
  const subscription = snapshot.principal.subscription;
  return subscription.plan === 'pro' && subscription.status === 'active' ? 'Pro' : 'Free';
}

export function createPrincipalRefresh(options: {
  initial: Introspection;
  load: (signal: AbortSignal) => Promise<unknown>;
  isCurrentOwner: () => boolean;
  onChange: (snapshot: PrincipalSnapshot) => void;
  onRefusal: (error: ApiError) => void;
}) {
  let snapshot: PrincipalSnapshot = { principal: options.initial, status: 'verified' };
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let requestTimeout: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let pending: Promise<void> | undefined;
  const publish = (status: PrincipalSnapshot['status']) => {
    snapshot = { ...snapshot, status };
    options.onChange(snapshot);
  };
  const schedule = (retry = false) => {
    if (closed) return;
    clearTimeout(timer);
    const remaining = validity(snapshot.principal) - Date.now();
    const delay = retry
      ? remaining > 0
        ? Math.min(10000, remaining)
        : 10000
      : Math.max(1, remaining);
    timer = setTimeout(() => void refresh(), delay);
  };
  function refresh(): Promise<void> {
    if (closed || !options.isCurrentOwner()) return Promise.resolve();
    if (validity(snapshot.principal) <= Date.now()) publish('checking');
    if (pending) return pending;
    clearTimeout(timer);
    controller = new AbortController();
    const signal = controller.signal;
    requestTimeout = setTimeout(() => controller?.abort(), 15000);
    if (validity(snapshot.principal) > Date.now()) schedule();
    pending = (async () => {
      let retry = false;
      try {
        const value = await Promise.resolve().then(() => options.load(signal));
        if (closed || !options.isCurrentOwner()) return;
        if (signal.aborted) throw new ApiError(0, 'The account request timed out.');
        const principal = validateAccountPrincipal(value, snapshot.principal.user.id);
        if (validity(principal) <= Date.now())
          throw new ApiError(503, 'The account service returned an expired account session.');
        snapshot = { principal, status: 'verified' };
        options.onChange(snapshot);
      } catch (error) {
        if (closed || !options.isCurrentOwner()) return;
        if (
          !signal.aborted &&
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403)
        ) {
          closed = true;
          options.onRefusal(error);
          return;
        }
        retry = true;
        if (validity(snapshot.principal) <= Date.now()) publish('unavailable');
      } finally {
        clearTimeout(timer);
        clearTimeout(requestTimeout);
        requestTimeout = undefined;
        controller = undefined;
        pending = undefined;
        if (!closed && options.isCurrentOwner()) schedule(retry);
      }
    })();
    return pending;
  }
  schedule();
  return {
    refresh,
    dispose() {
      closed = true;
      clearTimeout(timer);
      clearTimeout(requestTimeout);
      controller?.abort();
    },
  };
}
