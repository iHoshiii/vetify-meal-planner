import type { MealPlanInput } from '@vetify/planner-shared/meal-plans';
import type { Pet } from '@vetify/planner-shared/pets';
import { StyleSheet, View } from 'react-native';
import { FoodEnergyFields } from './plan-food-energy';
import { FoodIdentityFields } from './plan-food-identity';

export function FoodFields({
  pet,
  value,
  set,
}: {
  pet: Pet;
  value: MealPlanInput;
  set: (value: MealPlanInput) => void;
}) {
  return (
    <View style={styles.fields}>
      <FoodIdentityFields value={value} set={set} />
      <FoodEnergyFields pet={pet} value={value} set={set} />
    </View>
  );
}

const styles = StyleSheet.create({ fields: { gap: 16 } });
