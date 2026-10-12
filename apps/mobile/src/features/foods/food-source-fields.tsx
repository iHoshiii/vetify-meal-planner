import { Image } from 'react-native';
import { Field } from '../../components/ui';
import { MealTypeChoice } from './meal-type-choice';
import type { FoodFormState } from './use-food-form';
import { styles } from './food-form-styles';
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
