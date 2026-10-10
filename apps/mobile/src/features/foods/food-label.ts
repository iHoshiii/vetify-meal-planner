import type { FoodLabel } from '@vetify/planner-shared/foods';
import type { MealPlanInput } from '@vetify/planner-shared/meal-plans';
import type { Pet } from '@vetify/planner-shared/pets';

export function newFoodLabel(pet: Pick<Pet, 'species'>): FoodLabel {
  return {
    name: '',
    form: 'dry',
    adequacy: 'unknown',
    species: pet.species,
    lifeStage: 'unknown',
    calorieBasis: 'kg',
    calories: null,
    packageGrams: null,
    labelSource: '',
    labelCheckedOn: null,
  };
}

export function foodWithAmounts(
  food: FoodLabel,
  calories: string,
  packageGrams: string,
): FoodLabel {
  const number = (value: string) => (value.trim() === '' ? null : Number(value));
  return { ...food, calories: number(calories), packageGrams: number(packageGrams) };
}

export function prefillPlanFood(input: MealPlanInput, food: FoodLabel): MealPlanInput {
  return { ...input, food: { ...food } };
}

export function sameFoodLabel(left: FoodLabel, right: FoodLabel): boolean {
  return (Object.keys(newFoodLabel({ species: 'dog' })) as Array<keyof FoodLabel>).every(
    (key) => left[key] === right[key],
  );
}

export function foodMatchesPet(food: FoodLabel, pet: Pick<Pet, 'species'>): boolean {
  return food.species === pet.species;
}

export function foodCalories(food: FoodLabel): string {
  if (food.calories === null) return 'Calories not provided';
  const amount = `${food.calories.toLocaleString()} kcal/${food.calorieBasis === 'kg' ? 'kg' : 'package'}`;
  return food.calorieBasis === 'package' && food.packageGrams !== null
    ? `${amount} · ${food.packageGrams} g`
    : amount;
}
