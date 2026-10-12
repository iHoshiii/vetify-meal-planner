import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { colors } from './theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
export function Button({
  label,
  onPress,
  disabled,
  variant = 'primary',
  icon,
  compact = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
  icon?: ReactNode;
  compact?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'danger' && styles.danger,
        variant === 'ghost' && styles.ghost,
        compact && styles.compact,
        (pressed || disabled) && { opacity: 0.55 },
      ]}
    >
      {icon}
      <Text
        style={[
          styles.label,
          compact && styles.compactLabel,
          (variant === 'primary' || variant === 'danger') && styles.light,
        ]}
      >
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
        thumbColor={colors.white}
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
    <View
      style={[
        styles.notice,
        tone === 'warning' && styles.warning,
        tone === 'error' && styles.errorNotice,
      ]}
    >
      <Text
        style={{
          color: tone === 'warning' ? '#92400e' : tone === 'error' ? colors.danger : colors.ink,
          fontSize: 13,
          lineHeight: 20,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  danger: { backgroundColor: colors.danger, borderColor: colors.danger },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  compact: { paddingHorizontal: 12, paddingVertical: 9 },
  label: { color: colors.ink, fontSize: 15, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  compactLabel: { fontSize: 14 },
  light: { color: colors.white },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  toggleText: { flex: 1, color: colors.ink, fontSize: 15 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: { color: colors.danger, lineHeight: 21 },
  notice: { padding: 12, borderRadius: 10, backgroundColor: colors.soft },
  warning: { backgroundColor: '#fffbeb' },
  errorNotice: { backgroundColor: '#fff1f2' },
});
