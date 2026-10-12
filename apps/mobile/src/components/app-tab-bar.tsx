import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './app-icon';
import { colors } from './theme';

export type AppTab = 'foods' | 'tracker' | 'progress';
export function AppTabBar({
  value,
  onChange,
  disabled = false,
}: {
  value: AppTab;
  onChange: (tab: AppTab) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {(
        [
          { value: 'foods', label: 'Foods', icon: 'bowl' },
          { value: 'tracker', label: 'Tracker', icon: 'calendar' },
          { value: 'progress', label: 'Progress', icon: 'chart' },
        ] as const
      ).map((tab) => {
        const selected = value === tab.value;
        const color = selected ? colors.primary : colors.muted;
        return (
          <Pressable
            key={tab.value}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(tab.value)}
            style={({ pressed }) => [
              styles.tab,
              selected && styles.selected,
              disabled && { opacity: 0.45 },
              pressed && { opacity: 0.6 },
            ]}
          >
            <AppIcon name={tab.icon} size={21} color={color} />
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: {
    flex: 1,
    minHeight: 52,
    borderRadius: 10,
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.soft },
  label: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
