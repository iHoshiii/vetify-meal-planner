import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState, KeyboardAvoidingView, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { AuthBoundary } from './auth/auth-boundary';
import { authColors } from './auth/auth-theme';
import { getSession, subscribeSession } from './auth/session';
import { AppHeader } from './components/app-header';
import { colors, Notice } from './components/ui';
import PlannerPage from './features/planner/planner-page';

function ConnectedPlanner() {
  const [online, setOnline] = useState(true);
  useEffect(
    () =>
      NetInfo.addEventListener((state) => {
        const connected = state.isConnected !== false && state.isInternetReachable !== false;
        setOnline(connected);
        onlineManager.setOnline(connected);
      }),
    [],
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      focusManager.setFocused(state === 'active'),
    );
    return () => subscription.remove();
  }, []);
  return (
    <View style={{ flex: 1 }}>
      <AppHeader />
      {online ? (
        <PlannerPage />
      ) : (
        <View style={{ padding: 20 }}>
          <Notice tone="warning">You are offline. Connect to view or save meals.</Notice>
        </View>
      )}
    </View>
  );
}
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
