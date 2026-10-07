import type { MealPlanInput } from '@vetify/planner-shared/meal-plans';
import type { Pet } from '@vetify/planner-shared/pets';
import { StyleSheet, View } from 'react-native';
import { accountToday } from '../../auth/session';
import { Choice, Field, Notice } from '../../components/ui';
import { PlanNumberField } from './plan-number-field';

export function FoodEnergyFields({
  pet,
  value,
  set,
}: {
  pet: Pet;
  value: MealPlanInput;
  set: (value: MealPlanInput) => void;
}) {
  const update = (patch: Partial<MealPlanInput['food']>) =>
    set({ ...value, food: { ...value.food, ...patch } });
  const optional = value.mode === 'manual' ? ' (optional)' : '';
  return (
    <View style={styles.fields}>
      <Choice
        label="Calories printed per"
        value={value.food.calorieBasis}
        options={[
          { value: 'kg', label: 'Kilogram' },
          { value: 'package', label: 'Can or pouch' },
        ]}
        onChange={(basis) =>
          update({ calorieBasis: basis as MealPlanInput['food']['calorieBasis'], calories: null })
        }
      />
      <PlanNumberField
        label={`Label calories, kcal/${value.food.calorieBasis === 'kg' ? 'kg' : 'package'}`}
        value={value.food.calories}
        placeholder={value.food.calorieBasis === 'kg' ? 'e.g. 3500' : 'e.g. 85'}
        onChange={(calories) => update({ calories })}
      />
      {value.food.calorieBasis === 'package' && (
        <PlanNumberField
          label="Net food weight per can or pouch, g"
          value={value.food.packageGrams}
          placeholder="e.g. 85"
          onChange={(packageGrams) => update({ packageGrams })}
        />
      )}
      <Field
        label={`Where did the calorie figure come from?${optional}`}
        value={value.food.labelSource}
        maxLength={180}
        placeholder="e.g. Bag label or manufacturer website"
        onChangeText={(labelSource) => update({ labelSource })}
      />
      <Field
        label={`Date label was checked${optional}`}
        value={value.food.labelCheckedOn ?? ''}
        maxLength={10}
        placeholder="YYYY-MM-DD"
        hint={`Use a date on or before ${accountToday()}.`}
        onChangeText={(date) => update({ labelCheckedOn: date || null })}
      />
      <PlanNumberField
        label="Treats and other extras, kcal/day"
        value={value.extrasKcal}
        placeholder="Unknown"
        hint="Enter 0 if none."
        onChange={(extrasKcal) => set({ ...value, extrasKcal })}
      />
      <Notice tone="warning">
        Check the exact package. A different formula or size may have different calories.
        {pet.allergies.length ? ' Review the reported food reactions before using this food.' : ''}
      </Notice>
    </View>
  );
}

const styles = StyleSheet.create({ fields: { gap: 16 } });
