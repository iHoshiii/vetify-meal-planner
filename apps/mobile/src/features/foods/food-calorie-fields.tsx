import type { FoodLabel } from '@vetify/planner-shared/foods';
import { Choice, Field } from '../../components/ui';
import type { FoodFormState } from './use-food-form';
export function FoodCalorieFields({ state }: { state: FoodFormState }) {
  const { food, update, calories, packageGrams, setCalories, setPackageGrams, setValidation } =
    state;
  return (
    <>
      <Choice<FoodLabel['calorieBasis']>
        label="Calories printed per"
        value={food.calorieBasis}
        options={[
          { value: 'kg', label: 'Kilogram' },
          { value: 'package', label: 'Can or pouch' },
        ]}
        onChange={(calorieBasis) => {
          update({ calorieBasis });
          setCalories('');
        }}
      />
      <Field
        label={`Calories, kcal/${food.calorieBasis === 'kg' ? 'kg' : 'package'}`}
        value={calories}
        onChangeText={(value) => {
          setCalories(value);
          setValidation('');
        }}
        keyboardType="decimal-pad"
        placeholder="Unknown"
        hint="Leave blank if not on the label."
      />
      {food.calorieBasis === 'package' && (
        <Field
          label="Package net weight, g"
          value={packageGrams}
          onChangeText={(value) => {
            setPackageGrams(value);
            setValidation('');
          }}
          keyboardType="decimal-pad"
          placeholder="Unknown"
        />
      )}
    </>
  );
}
