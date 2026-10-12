import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { authColors } from './auth-theme';

export function AuthButton({
  label,
  onPress,
  disabled,
  icon,
  compact = false,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  compact?: boolean;
  variant?: 'primary' | 'social' | 'link';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        compact && styles.compact,
        pressed && variant === 'primary' && { backgroundColor: authColors.primaryPressed },
        (pressed || disabled) && { opacity: 0.65 },
      ]}
    >
      {icon}
      <Text
        style={[
          styles.label,
          variant === 'primary' && styles.light,
          variant === 'link' && styles.linkLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  primary: { backgroundColor: authColors.primary },
  social: { backgroundColor: authColors.secondary },
  link: { backgroundColor: 'transparent', minHeight: 44, paddingVertical: 10 },
  compact: { minHeight: 44, paddingVertical: 10 },
  label: { color: authColors.heading, fontSize: 14, fontWeight: '600' },
  light: { color: authColors.surface, fontSize: 16 },
  linkLabel: { color: authColors.link },
});
