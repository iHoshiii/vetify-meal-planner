import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Field, colors } from '../../../components/ui';
import type { FoodFormState } from './use-food-form';
import { styles } from './food-form-styles';
import type { MealType } from '@vetify/planner-shared/foods';
import { mealTypes } from '../food-browse';

export function FoodSourceFields({ state }: { state: FoodFormState }) {
  const { food, details, isIngredient, update, updateDetails } = state;
  return (
    <>
      <MealTypeChoice
        value={details.mealTypes ?? []}
        onChange={(mealTypes) => updateDetails({ mealTypes })}
      />
      <Field
        label="Notes (optional)"
        value={details.notes}
        onChangeText={(notes) => updateDetails({ notes })}
        multiline
        maxLength={500}
        placeholder="Preparation or label notes"
      />
      <Field
        label="Source (optional)"
        value={food.labelSource}
        onChangeText={(labelSource) => update({ labelSource })}
        maxLength={180}
        placeholder={isIngredient ? 'Where these values came from' : 'Package or manufacturer'}
      />
      <Field
        label="Date checked (optional)"
        value={food.labelCheckedOn ?? ''}
        onChangeText={(value) => update({ labelCheckedOn: value || null })}
        maxLength={10}
        placeholder="YYYY-MM-DD"
      />
      <Field
        label="Photo URL (optional)"
        value={details.imageUrl ?? ''}
        onChangeText={(value) =>
          updateDetails({ imageUrl: value.trim() === '' ? null : value.trim() })
        }
        maxLength={500}
        placeholder="https://…"
      />
      {details.imageUrl ? (
        <Image
          source={{ uri: details.imageUrl }}
          style={styles.preview}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </>
  );
}

export function MealTypeChoice({
  value,
  onChange,
}: {
  value: readonly MealType[];
  onChange: (types: MealType[]) => void;
}) {
  return (
    <View style={mealStyles.field}>
      <Text style={mealStyles.label}>Meal type (optional)</Text>
      <View style={mealStyles.options}>
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
              style={[mealStyles.option, checked && mealStyles.selected]}
            >
              <Text style={[mealStyles.text, checked && mealStyles.selectedText]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
const mealStyles = StyleSheet.create({
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
