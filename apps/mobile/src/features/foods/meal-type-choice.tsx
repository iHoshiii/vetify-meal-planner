import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MealType } from '@vetify/planner-shared/foods';
import { colors } from '../../components/ui';
import { mealTypes } from './food-browse';

export function MealTypeChoice({
  value,
  onChange,
}: {
  value: readonly MealType[];
  onChange: (types: MealType[]) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Meal type (optional)</Text>
      <View style={styles.options}>
        {mealTypes.map(({ value: type, label }) => {
          const checked = value.includes(type);
          return (
            <Pressable
              key={type}
              accessibilityRole="checkbox"
              accessibilityLabel={`Meal type: ${label}`}
              accessibilityState={{ checked }}
              onPress={() =>
                onChange(checked ? value.filter((item) => item !== type) : [...value, type])
              }
              style={[styles.option, checked && styles.selected]}
            >
              <Text style={[styles.text, checked && styles.selectedText]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  field: { gap: 7, minWidth: 0 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  text: { color: colors.ink, fontSize: 14 },
  selectedText: { color: colors.primary, fontWeight: '600' },
});
