import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getSession, subscribeSession, setAccountTimeZone } from './session';
import { loginUrl, refreshSession } from './main-auth';
import { ApiError } from '@/services/api-error';
import { apiFetch } from '@/services/api';
import { introspectionSchema, type Introspection } from '@vetify/planner-shared/core-contract';

const PrincipalContext = createContext<Introspection | null>(null);
export const usePrincipal = () => useContext(PrincipalContext);

export function AuthBoundary({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(subscribeSession, getSession);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [principal, setPrincipal] = useState<Introspection | null>(null);
  useEffect(() => {
    let active = true;
    setStatus('loading');
    refreshSession()
      .then(() => apiFetch('/session'))
      .then((value) => {
        const parsed = introspectionSchema.safeParse(value);
        if (!parsed.success)
          throw new ApiError(503, 'The planner returned an invalid account session.');
        if (parsed.data.user.status !== 'active')
          throw new ApiError(403, 'This account cannot access the planner.');
        if (active) {
          setAccountTimeZone(parsed.data.region.timeZone);
          setPrincipal(parsed.data);
          setStatus('ready');
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          window.location.assign(loginUrl());
        } else {
          setMessage(error instanceof Error ? error.message : 'The planner could not connect.');
          setStatus('error');
        }
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  useEffect(() => {
    if (status === 'ready' && !session) window.location.assign(loginUrl());
    if (status === 'ready' && session && principal && principal.user.id !== session.user.id)
      setAttempt((value) => value + 1);
  }, [session, status, principal]);
  if (status === 'loading')
    return (
      <p role="status" className="p-8 text-center">
        Connecting to your account...
      </p>
    );
  if (status === 'error')
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-xl font-bold">Planner unavailable</h1>
        <p role="alert" className="my-4">
          {navigator.onLine
            ? message
            : 'You are offline. Connect to your account before viewing or saving meals.'}
        </p>
        <button
          type="button"
          className="rounded-lg bg-teal-700 px-4 py-2 text-white"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Try again
        </button>
      </main>
    );
  if (!session) return null;
  return (
    <AccountQueries key={session.user.id}>
      <PrincipalContext.Provider value={principal}>{children}</PrincipalContext.Provider>
    </AccountQueries>
  );
}

function AccountQueries({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  useEffect(() => () => client.clear(), [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
