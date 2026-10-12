import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { Introspection } from '@vetify/planner-shared/core-contract';
import { apiFetch, ApiError } from '../services/api';
import { getSession, setAccountTimeZone } from './session';
import { createPrincipalRefresh, type PrincipalSnapshot } from './principal-refresh';

export function usePrincipalRefresh(
  initial: Introspection | null,
  enabled: boolean,
  onRefusal: (error: ApiError) => void,
) {
  const [state, setState] = useState<{
    initial: Introspection;
    snapshot: PrincipalSnapshot;
  } | null>(null);
  useEffect(() => {
    if (!enabled || !initial) return;
    const ownerId = initial.user.id;
    const current = createPrincipalRefresh({
      initial,
      load: (signal) => apiFetch('/session', { signal }),
      isCurrentOwner: () => getSession()?.user.id === ownerId,
      onChange: (next) => {
        setAccountTimeZone(next.principal.region.timeZone);
        setState({ initial, snapshot: next });
      },
      onRefusal,
    });
    setState({ initial, snapshot: { principal: initial, status: 'verified' } });
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void current.refresh();
    });
    return () => {
      listener.remove();
      current.dispose();
    };
  }, [initial, enabled, onRefusal]);
  if (!initial || !enabled) return null;
  return state?.initial === initial
    ? state.snapshot
    : { principal: initial, status: 'verified' as const };
}
