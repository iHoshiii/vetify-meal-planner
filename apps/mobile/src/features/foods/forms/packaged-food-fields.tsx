import type { FoodLabel } from '@vetify/planner-shared/foods';
import { Choice, Field } from '../../../components/ui';
import type { FoodFormState } from './use-food-form';

export function FoodSuitabilityFields({ state }: { state: FoodFormState }) {
  const { food, update } = state;
  return (
    <>
      <Choice<FoodLabel['species']>
        label="Made for"
        value={food.species}
        options={[
          { value: 'dog', label: 'Dogs' },
          { value: 'cat', label: 'Cats' },
          { value: 'other', label: 'Other' },
        ]}
        onChange={(species) => update({ species })}
      />
      <Choice<FoodLabel['adequacy']>
        label="Label says"
        value={food.adequacy}
        options={[
          { value: 'unknown', label: 'Not sure' },
          { value: 'complete', label: 'Complete and balanced' },
          { value: 'supplemental', label: 'Supplemental only' },
        ]}
        onChange={(adequacy) => update({ adequacy })}
      />
      <Choice<FoodLabel['lifeStage']>
        label="Life stage"
        value={food.lifeStage}
        options={[
          { value: 'unknown', label: 'Not sure' },
          { value: 'adult', label: 'Adult' },
          { value: 'growth', label: 'Growth' },
          { value: 'all', label: 'All stages' },
        ]}
        onChange={(lifeStage) => update({ lifeStage })}
      />
    </>
  );
}

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
