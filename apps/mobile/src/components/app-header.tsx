import { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { apiFetch } from '../services/api';
import { getSession } from '../auth/session';
import { logout } from '../auth/main-auth';
import { useAccountPlan } from '../auth/auth-boundary';
import { Button, colors, ErrorMessage } from './ui';

export function AppHeader() {
  const plan = useAccountPlan();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function perform(action: 'export' | 'logout') {
    setPending(true);
    setError('');
    try {
      if (action === 'logout') await logout();
      else {
        if (!(await Sharing.isAvailableAsync()))
          throw new Error('File sharing is unavailable on this device.');
        const data = await apiFetch('/export');
        const file = new File(Paths.cache, 'vetify-planner-export.json');
        try {
          file.create({ overwrite: true });
          file.write(JSON.stringify(data, null, 2));
          await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
        } finally {
          if (file.exists) file.delete();
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not complete this action.');
    } finally {
      setPending(false);
    }
  }
  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>Vetify Planner</Text>
          <Text style={styles.account}>
            {getSession()?.user.name || getSession()?.user.email} · {plan}
          </Text>
        </View>
        <Button
          label="Export"
          variant="ghost"
          disabled={pending}
          onPress={() => void perform('export')}
        />
        <Button
          label="Log out"
          variant="ghost"
          disabled={pending}
          onPress={() => void perform('logout')}
        />
      </View>
      <ErrorMessage message={error} />
    </View>
  );
}
const styles = StyleSheet.create({
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  brand: { fontWeight: '700', fontSize: 19, color: colors.ink },
  account: { fontSize: 12, color: colors.muted, marginTop: 4 },
});
