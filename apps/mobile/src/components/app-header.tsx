import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getSession } from '../auth/session';
import type { Pet } from '@vetify/planner-shared/pets';
import { AppIcon } from './app-icon';
import { colors } from './theme';

export function AppHeader({
  pet,
  onSwitchPet,
  onOpenAccount,
  switchingDisabled = false,
}: {
  pet?: Pet;
  onSwitchPet: () => void;
  onOpenAccount: () => void;
  switchingDisabled?: boolean;
}) {
  const user = getSession()?.user;
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={pet ? `Switch pet. Current pet: ${pet.name}` : 'Choose a pet'}
        accessibilityState={{ disabled: switchingDisabled }}
        disabled={switchingDisabled}
        onPress={onSwitchPet}
        style={({ pressed }) => [styles.brand, (pressed || switchingDisabled) && { opacity: 0.6 }]}
      >
        <View style={styles.mark}>
          <AppIcon name="paw" size={23} />
        </View>
        <View style={styles.identity}>
          <Text style={styles.brandName}>Vetify</Text>
          <Text style={styles.title} numberOfLines={1}>
            {pet?.name ?? 'Choose a pet'}
          </Text>
        </View>
        <AppIcon name="chevron-down" size={16} color={colors.muted} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open account"
        onPress={onOpenAccount}
        style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.initial}>
          {(user?.name || user?.email || 'V').slice(0, 1).toUpperCase()}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginRight: 16,
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: { flexShrink: 1, minWidth: 0, gap: 1 },
  brandName: { color: colors.muted, fontSize: 11 },
  title: { fontWeight: '600', fontSize: 17, color: colors.ink },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontSize: 16, fontWeight: '600', color: colors.primary },
});
