import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAccountPlan } from '../../auth/auth-boundary';
import { logout } from '../../auth/main-auth';
import { getSession } from '../../auth/session';
import { AppIcon } from '../../components/app-icon';
import { Card, colors, ErrorMessage } from '../../components/ui';
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
      <Card>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <AppIcon name="user" size={24} />
          </View>
          <View style={styles.details}>
            <Text style={styles.name}>{user?.name || 'Your account'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>
        <View style={styles.membership}>
          <Text style={styles.membershipLabel}>Subscription</Text>
          <Text style={styles.plan}>{plan}</Text>
        </View>
      </Card>
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

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 20,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  heading: { fontSize: 26, fontWeight: '700', color: colors.ink, letterSpacing: -0.5 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: { flex: 1, gap: 4 },
  name: { color: colors.ink, fontSize: 17, fontWeight: '600' },
  email: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  membership: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  membershipLabel: { flex: 1, color: colors.muted, fontSize: 14 },
  plan: {
    color: colors.primary,
    backgroundColor: colors.soft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastAction: { borderBottomWidth: 0 },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
});
