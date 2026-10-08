import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { introspectionSchema, type Introspection } from '@vetify/planner-shared/core-contract';
import { Button, colors, ErrorMessage } from '../components/ui';
import { apiFetch, ApiError } from '../services/api';
import { getSession, subscribeSession, setAccountTimeZone } from './session';
import { exchangeMainCode, refreshSession } from './main-auth';
import { LoginScreen } from './login-screen';
import { useMainAccountLink } from './use-main-account-link';

const PrincipalContext = createContext<Introspection | null>(null);
export const usePrincipal = () => useContext(PrincipalContext);
export function AuthBoundary({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(subscribeSession, getSession);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'unconnected'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState('');
  const [principal, setPrincipal] = useState<Introspection | null>(null);
  const link = useMainAccountLink();
  const exchange = useRef<{
    code: string;
    promise: ReturnType<typeof exchangeMainCode>;
  } | null>(null);
  useEffect(() => {
    if (!link.ready) return;
    let active = true;
    const controller = new AbortController();
    setStatus('loading');
    setMessage('');
    setPrincipal(null);
    if (link.code && exchange.current?.code !== link.code)
      exchange.current = { code: link.code, promise: exchangeMainCode(link.code) };
    const authentication = link.code ? exchange.current!.promise : refreshSession();
    authentication
      .then(() => {
        if (!active) return;
        const timeout = setTimeout(() => controller.abort(), 15000);
        return apiFetch('/session', { signal: controller.signal }).finally(() =>
          clearTimeout(timeout),
        );
      })
      .then((value) => {
        if (!active) return;
        const parsed = introspectionSchema.safeParse(value);
        if (!parsed.success)
          throw new ApiError(503, 'The planner returned an invalid account session.');
        if (parsed.data.user.status !== 'active')
          throw new ApiError(403, 'This account cannot access the planner.');
        if (parsed.data.user.id !== getSession()?.user.id)
          throw new ApiError(503, 'The account session changed. Try again.');
        if (active) {
          setAccountTimeZone(parsed.data.region.timeZone);
          setPrincipal(parsed.data);
          setStatus('ready');
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          setMessage(error.message);
          setPrincipal(null);
          setStatus('unconnected');
        } else {
          setMessage(error instanceof Error ? error.message : 'Could not connect.');
          setStatus('error');
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt, link.ready, link.code]);
  useEffect(() => {
    if (session && principal && principal.user.id !== session.user.id) {
      setPrincipal(null);
      setAttempt((value) => value + 1);
    }
  }, [session?.user.id, principal]);
  if (status === 'error')
    return (
      <View style={{ padding: 24, gap: 18 }}>
        <Text style={{ fontSize: 24, color: colors.ink }}>Planner unavailable</Text>
        <ErrorMessage message={message} />
        <Text style={{ color: colors.muted }}>
          Check your connection and that the account service and API are running.
        </Text>
        <Button label="Try again" onPress={() => setAttempt((value) => value + 1)} />
      </View>
    );
  if (status === 'loading')
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 18 }}>
        <ActivityIndicator color={colors.primary} />
        <Text>Connecting to your account...</Text>
      </View>
    );
  if (!session || status === 'unconnected')
    return (
      <LoginScreen
        initialError={message}
        onSignedIn={() => {
          link.clearCode(link.code);
          setAttempt((value) => value + 1);
        }}
      />
    );
  if (!principal || principal.user.id !== session.user.id)
    return <ActivityIndicator color={colors.primary} />;
  return (
    <AccountQueries key={session.user.id}>
      <PrincipalContext.Provider value={principal}>{children}</PrincipalContext.Provider>
    </AccountQueries>
  );
}
function AccountQueries({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  useEffect(() => () => client.clear(), [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
