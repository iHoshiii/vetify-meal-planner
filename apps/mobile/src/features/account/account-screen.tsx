import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAccountPlan } from '../../auth/auth-boundary';
import { logout } from '../../auth/main-auth';
import { getSession } from '../../auth/session';
import { AppIcon } from '../../components/app-icon';
import { colors, ErrorMessage } from '../../components/ui';
import { apiFetch } from '../../services/api';

export function AccountScreen({
  onOpenPets,
  navigationDisabled = false,
}: {
  onOpenPets: () => void;
  navigationDisabled?: boolean;
}) {
  const user = getSession()?.user;
  const plan = useAccountPlan();
  const [pending, setPending] = useState<'export' | 'logout' | null>(null);
  const [error, setError] = useState('');
  async function perform(action: 'export' | 'logout') {
    if (pending) return;
    setPending(action);
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
      setPending(null);
    }
  }
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.heading}>
        Account
      </Text>
      <View style={styles.profile}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <AppIcon name="user" size={24} />
          </View>
          <View style={styles.details}>
            {user?.name?.trim() ? <Text style={styles.name}>{user.name.trim()}</Text> : null}
            {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
            <View style={styles.membership}>
              <Text style={styles.plan}>
                {plan === 'Free' || plan === 'Pro' ? `${plan} plan` : plan}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.actions}>
        {(
          [
            { action: 'pets', label: 'Pets', icon: 'paw' },
            { action: 'export', label: 'Export my data', icon: 'download' },
            { action: 'logout', label: 'Log out', icon: 'logout' },
          ] as const
        ).map((item) => {
          const color = item.action === 'logout' ? colors.danger : colors.ink;
          return (
            <Pressable
              key={item.action}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{
                disabled: pending !== null || (item.action === 'pets' && navigationDisabled),
              }}
              disabled={pending !== null || (item.action === 'pets' && navigationDisabled)}
              onPress={() => (item.action === 'pets' ? onOpenPets() : void perform(item.action))}
              style={({ pressed }) => [
                styles.action,
                item.action === 'logout' && styles.lastAction,
                (pressed || pending !== null) && { opacity: 0.6 },
              ]}
            >
              <AppIcon name={item.icon} color={color} />
              <Text style={[styles.actionLabel, { color }]}>
                {pending === item.action
                  ? item.action === 'export'
                    ? 'Exporting...'
                    : 'Logging out...'
                  : item.label}
              </Text>
              <AppIcon name="chevron-right" size={16} color={colors.muted} />
            </Pressable>
          );
        })}
      </View>
      <ErrorMessage message={error} />
    </ScrollView>
  );
}

import { styles } from './account-styles';
