import type { MealPlanInput } from '@vetify/planner-shared/meal-plans';
import { StyleSheet, View } from 'react-native';
import { Choice, Field } from '../../components/ui';

export function FoodIdentityFields({
  value,
  set,
}: {
  value: MealPlanInput;
  set: (value: MealPlanInput) => void;
}) {
  const update = (patch: Partial<MealPlanInput['food']>) =>
    set({ ...value, food: { ...value.food, ...patch } });
  return (
    <View style={styles.fields}>
      <Field
        label="Exact food name"
        placeholder="e.g. Brand Adult Chicken dry food"
        value={value.food.name}
        maxLength={120}
        onChangeText={(name) => update({ name })}
      />
      <Choice
        label="Label says"
        value={value.food.adequacy}
        options={[
          { value: 'unknown', label: 'Not sure' },
          { value: 'complete', label: 'Complete and balanced' },
          { value: 'supplemental', label: 'Supplemental feeding only' },
        ]}
        onChange={(adequacy) => update({ adequacy: adequacy as MealPlanInput['food']['adequacy'] })}
      />
      <Choice
        label="Food form"
        value={value.food.form}
        options={[
          { value: 'dry', label: 'Dry' },
          { value: 'wet', label: 'Wet' },
          { value: 'other', label: 'Other' },
        ]}
        onChange={(form) => update({ form: form as MealPlanInput['food']['form'] })}
      />
      <Choice
        label="Made for"
        value={value.food.species}
        options={[
          { value: 'dog', label: 'Dogs' },
          { value: 'cat', label: 'Cats' },
          { value: 'other', label: 'Other' },
        ]}
        onChange={(species) => update({ species: species as MealPlanInput['food']['species'] })}
      />
      <Choice
        label="Life stage on label"
        value={value.food.lifeStage}
        options={[
          { value: 'unknown', label: 'Not sure' },
          { value: 'adult', label: 'Adult maintenance' },
          { value: 'growth', label: 'Growth' },
          { value: 'all', label: 'All life stages' },
        ]}
        onChange={(lifeStage) =>
          update({ lifeStage: lifeStage as MealPlanInput['food']['lifeStage'] })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({ fields: { gap: 16 } });
