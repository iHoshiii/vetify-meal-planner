import {
  defaultFoodDetails,
  filterFoodCatalogForSpecies,
  type FoodDetails,
  type FoodLabel,
} from '@vetify/planner-shared/foods';
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

export function newFoodDetails(): FoodDetails {
  return defaultFoodDetails('ingredient');
}

export function withFoodDetails<T extends { food: FoodLabel; details?: FoodDetails }>(
  item: T,
): T & { details: FoodDetails } {
  return { ...item, details: item.details ?? defaultFoodDetails() };
}

export function cloneFoodDetails(details: FoodDetails): FoodDetails {
  return { ...details, nutritionPer100g: { ...details.nutritionPer100g } };
}

export type NutritionValues = Record<keyof FoodDetails['nutritionPer100g'], string>;

export function nutritionValues(details: FoodDetails): NutritionValues {
  return {
    kcal: details.nutritionPer100g.kcal?.toString() ?? '',
    proteinG: details.nutritionPer100g.proteinG?.toString() ?? '',
    fatG: details.nutritionPer100g.fatG?.toString() ?? '',
    carbsG: details.nutritionPer100g.carbsG?.toString() ?? '',
  };
}

export function detailsWithNutrition(details: FoodDetails, values: NutritionValues): FoodDetails {
  const number = (value: string) => (value.trim() === '' ? null : Number(value));
  return {
    ...details,
    nutritionPer100g: {
      kcal: number(values.kcal),
      proteinG: number(values.proteinG),
      fatG: number(values.fatG),
      carbsG: number(values.carbsG),
    },
  };
}

export function ingredientLabel(food: FoodLabel): FoodLabel {
  return {
    ...food,
    form: 'other',
    adequacy: 'supplemental',
    calorieBasis: 'kg',
    calories: null,
    packageGrams: null,
  };
}

export const foodCategories = [
  { value: 'protein', label: 'Protein' },
  { value: 'carb', label: 'Carbs' },
  { value: 'vegetable', label: 'Vegetables' },
  { value: 'fruit', label: 'Fruit' },
  { value: 'other', label: 'Other' },
] as const;

export type FoodCategoryFilter = NonNullable<FoodDetails['category']> | 'all';

export function filterFoods<T extends { food: FoodLabel; details: FoodDetails }>(
  foods: readonly T[],
  search: string,
  category: FoodCategoryFilter,
): T[] {
  const query = search.trim().toLocaleLowerCase();
  return foods.filter(
    (item) =>
      item.food.name.toLocaleLowerCase().includes(query) &&
      (category === 'all' || item.details.category === category),
  );
}

export function catalogForPet<T extends { food: FoodLabel; details: FoodDetails }>(
  catalog: readonly T[],
  pet: Pick<Pet, 'species'>,
): T[] {
  return filterFoodCatalogForSpecies(catalog, pet.species);
}

export function nutritionText(value: number | null, suffix: string): string {
  return value === null ? 'Unknown' : `${value.toLocaleString()}${suffix}`;
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
