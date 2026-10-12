import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../components/ui';

export function FoodCategoryChoice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.options}
      >
        <View accessibilityRole="radiogroup" style={styles.options}>
          {options.map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={`${label}: ${option.label}`}
              accessibilityState={{ checked: option.value === value }}
              onPress={() => onChange(option.value)}
              style={[styles.option, option.value === value && styles.selected]}
            >
              <Text style={[styles.optionText, option.value === value && styles.selectedText]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  options: { flexDirection: 'row', gap: 8 },
  option: {
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.soft, borderColor: colors.primary },
  optionText: { color: colors.ink, fontSize: 14 },
  selectedText: { color: colors.primary, fontWeight: '600' },
});
