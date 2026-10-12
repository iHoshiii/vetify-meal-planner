import type { MealPlanInput } from '@vetify/planner-shared/meal-plans';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../components/ui';

export type MuscleCondition = NonNullable<MealPlanInput['muscleCondition']>;
const options: readonly { value: MuscleCondition; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'mild-loss', label: 'Mild loss' },
  { value: 'moderate-loss', label: 'Moderate loss' },
  { value: 'severe-loss', label: 'Severe loss' },
  { value: 'unknown', label: 'Not sure' },
];

export function MuscleConditionChoice({
  value,
  onChange,
  disabled = false,
}: {
  value: MuscleCondition | '';
  onChange: (value: MuscleCondition) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Muscle condition</Text>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={`Muscle condition: ${option.label}`}
            accessibilityState={{ checked: value === option.value, disabled }}
            disabled={disabled}
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
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  option: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.soft, borderColor: colors.primary },
  optionText: { color: colors.ink, fontSize: 13 },
  selectedText: { color: colors.primary, fontWeight: '600' },
});
