import { useSyncExternalStore } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthBoundary } from './auth/auth-boundary';
import { authColors } from './auth/auth-theme';
import { getSession, subscribeSession } from './auth/session';
import { colors } from './components/ui';
import { ConnectedPlanner } from './features/planner/connected-planner';

export default function App() {
  const session = useSyncExternalStore(subscribeSession, getSession);
  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: session ? colors.background : authColors.background }}
      >
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <AuthBoundary>
            <ConnectedPlanner />
          </AuthBoundary>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
