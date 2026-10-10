import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { colors } from './theme';

export function Field({
  label,
  hint,
  ...input
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: KeyboardTypeOptions;
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
  maxLength?: number;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...input}
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        autoCorrect={false}
        style={[styles.input, input.multiline && styles.multiline]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}
export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { label: string; value: T }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={`${label}: ${option.label}`}
            accessibilityState={{ checked: value === option.value }}
            onPress={() => onChange(option.value)}
            style={[styles.option, value === option.value && styles.selected]}
          >
            <Text style={[styles.optionText, value === option.value && styles.selectedText]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { fontSize: 14, fontWeight: '600', color: colors.ink },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    color: colors.ink,
    backgroundColor: colors.white,
    fontSize: 16,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: colors.muted },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.soft, borderColor: colors.primary },
  optionText: { color: colors.ink, fontSize: 14 },
  selectedText: { color: colors.primary, fontWeight: '600' },
});
