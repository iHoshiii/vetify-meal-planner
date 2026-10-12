import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
export function usePlannerConnectivity() {
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
  return online;
}
