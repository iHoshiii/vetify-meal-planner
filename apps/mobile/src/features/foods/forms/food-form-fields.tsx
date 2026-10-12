import type { FoodFormState } from './use-food-form';
import { FoodSuitabilityFields } from './packaged-food-fields';
import { FoodCalorieFields } from './packaged-food-fields';
import { FoodSourceFields } from './food-source-fields';
import { Text, View } from 'react-native';
import type { FoodDetails, FoodLabel } from '@vetify/planner-shared/foods';
import { Choice, Field } from '../../../components/ui';
import { FoodCategoryChoice } from './food-category-choice';
import { foodCategories } from '../food-label';
import { styles } from './food-form-styles';
import type { FoodFormProps } from './food-form';

export function FoodFormFields({ state, editing }: { state: FoodFormState; editing?: boolean }) {
  if (state.step === 0) return <FoodIdentityFields state={state} editing={editing} />;
  if (state.isIngredient && state.step === 1) return <FoodNutrientFields state={state} />;
  if (!state.isIngredient && state.step === 1) return <FoodSuitabilityFields state={state} />;
  if (!state.isIngredient && state.step === 2) return <FoodCalorieFields state={state} />;
  return <FoodSourceFields state={state} />;
}

export function FoodIdentityFields({
  state,
  editing,
}: {
  state: FoodFormState;
  editing: FoodFormProps['editing'];
}) {
  const { details, food, isIngredient, changeKind, update, updateDetails } = state;
  return (
    <>
      {!editing ? (
        <Choice<FoodDetails['kind']>
          label="Food type"
          value={details.kind}
          options={[
            { value: 'ingredient', label: 'Ingredient' },
            { value: 'packaged', label: 'Packaged food' },
          ]}
          onChange={changeKind}
        />
      ) : (
        <Text style={styles.hint}>{isIngredient ? 'Ingredient' : 'Packaged food'}</Text>
      )}
      <Field
        label="Food name"
        value={food.name}
        onChangeText={(name) => update({ name })}
        maxLength={120}
        placeholder={isIngredient ? 'e.g. Plain cooked chicken' : 'Name on the package'}
      />
      {isIngredient ? (
        <FoodCategoryChoice
          label="Category"
          value={details.category ?? 'unknown'}
          options={[{ value: 'unknown', label: 'Not sure' }, ...foodCategories]}
          onChange={(category) =>
            updateDetails({ category: category === 'unknown' ? null : category })
          }
        />
      ) : (
        <Choice<FoodLabel['form']>
          label="Food form"
          value={food.form}
          options={[
            { value: 'dry', label: 'Dry' },
            { value: 'wet', label: 'Wet' },
            { value: 'other', label: 'Other' },
          ]}
          onChange={(form) => update({ form })}
        />
      )}
    </>
  );
}

export function FoodNutrientFields({ state }: { state: FoodFormState }) {
  const { nutrition, updateNutrition } = state;
  return (
    <>
      <Text style={styles.hint}>Leave unknown values blank.</Text>
      <View style={styles.nutrientRow}>
        <View style={styles.nutrientField}>
          <Field
            label="Energy, kcal"
            value={nutrition.kcal}
            onChangeText={(value) => updateNutrition('kcal', value)}
            keyboardType="decimal-pad"
            placeholder="Unknown"
          />
        </View>
        <View style={styles.nutrientField}>
          <Field
            label="Protein, g"
            value={nutrition.proteinG}
            onChangeText={(value) => updateNutrition('proteinG', value)}
            keyboardType="decimal-pad"
            placeholder="Unknown"
          />
        </View>
      </View>
      <View style={styles.nutrientRow}>
        <View style={styles.nutrientField}>
          <Field
            label="Fat, g"
            value={nutrition.fatG}
            onChangeText={(value) => updateNutrition('fatG', value)}
            keyboardType="decimal-pad"
            placeholder="Unknown"
          />
        </View>
        <View style={styles.nutrientField}>
          <Field
            label="Carbs, g"
            value={nutrition.carbsG}
            onChangeText={(value) => updateNutrition('carbsG', value)}
            keyboardType="decimal-pad"
            placeholder="Unknown"
          />
        </View>
      </View>
      <Text style={styles.hint}>An ingredient is not a complete diet.</Text>
    </>
  );
}
