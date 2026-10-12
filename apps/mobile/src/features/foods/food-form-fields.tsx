import type { FoodFormState } from './use-food-form';
import { FoodIdentityFields } from './food-identity-fields';
import { FoodNutrientFields } from './food-nutrient-fields';
import { FoodSuitabilityFields } from './food-suitability-fields';
import { FoodCalorieFields } from './food-calorie-fields';
import { FoodSourceFields } from './food-source-fields';
export function FoodFormFields({ state, editing }: { state: FoodFormState; editing?: boolean }) {
  if (state.step === 0) return <FoodIdentityFields state={state} editing={editing} />;
  if (state.isIngredient && state.step === 1) return <FoodNutrientFields state={state} />;
  if (!state.isIngredient && state.step === 1) return <FoodSuitabilityFields state={state} />;
  if (!state.isIngredient && state.step === 2) return <FoodCalorieFields state={state} />;
  return <FoodSourceFields state={state} />;
}
