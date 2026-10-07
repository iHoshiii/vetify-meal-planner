import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { colors } from './theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
export function Button({
  label,
  onPress,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'danger' && styles.danger,
        variant === 'ghost' && styles.ghost,
        (pressed || disabled) && { opacity: 0.55 },
      ]}
    >
      <Text style={[styles.label, (variant === 'primary' || variant === 'danger') && styles.light]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Toggle({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.toggleText}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#cbd5e1', true: colors.primary }}
      />
    </View>
  );
}
export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
export function ErrorMessage({ message }: { message?: string }) {
  return message ? (
    <Text accessibilityRole="alert" style={styles.error}>
      {message}
    </Text>
  ) : null;
}
export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'warning' | 'error';
}) {
  return (
    <View style={[styles.notice, tone !== 'info' && { backgroundColor: '#fff1f2' }]}>
      <Text style={{ color: tone === 'info' ? colors.ink : colors.danger, lineHeight: 21 }}>
        {children}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2f3ef',
  },
  primary: { backgroundColor: colors.primary },
  danger: { backgroundColor: colors.danger },
  ghost: { backgroundColor: 'transparent' },
  label: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  light: { color: colors.white },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  toggleText: { flex: 1, color: colors.ink, fontSize: 15 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: { color: colors.danger, lineHeight: 21 },
  notice: { padding: 14, borderRadius: 12, backgroundColor: '#e2f3ef' },
});
