import { portionNutrition } from '@vetify/planner-shared/daily-diet';
import type { FoodDetails, FoodLabel, MealType } from '@vetify/planner-shared/foods';
import { filterFoods, type FoodCategoryFilter } from './food-label';

export const mealTypes = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
] as const;
export const foodSorts = [
  { value: 'default', label: 'Default' },
  { value: 'name-asc', label: 'Name A to Z' },
  { value: 'name-desc', label: 'Name Z to A' },
  { value: 'calories-asc', label: 'Calories low to high' },
  { value: 'calories-desc', label: 'Calories high to low' },
] as const;
export type FoodFilters = {
  category: FoodCategoryFilter;
  mealType: MealType | 'all';
  sort: (typeof foodSorts)[number]['value'];
};
export const defaultFoodFilters: FoodFilters = {
  category: 'all',
  mealType: 'all',
  sort: 'default',
};
export function activeFilterCount(filters: FoodFilters): number {
  return (
    Number(filters.category !== 'all') +
    Number(filters.mealType !== 'all') +
    Number(filters.sort !== 'default')
  );
}
export function browseFoods<T extends { food: FoodLabel; details: FoodDetails }>(
  items: readonly T[],
  search: string,
  filters: FoodFilters,
): T[] {
  const filtered = filterFoods(items, search, filters.category).filter(
    (item) => filters.mealType === 'all' || item.details.mealTypes?.includes(filters.mealType),
  );
  if (filters.sort === 'default') return filtered;
  const direction = filters.sort.endsWith('desc') ? -1 : 1;
  const byName = (left: T, right: T) =>
    left.food.name.localeCompare(right.food.name, undefined, { sensitivity: 'base' });
  if (filters.sort.startsWith('name'))
    return filtered.sort((left, right) => direction * byName(left, right));
  const calories = new Map(
    filtered.map((item) => [item, portionNutrition(item.food, item.details, 100).kcal]),
  );
  return filtered.sort((left, right) => {
    const a = calories.get(left) ?? null;
    const b = calories.get(right) ?? null;
    if (a === null || b === null) return a === b ? byName(left, right) : a === null ? 1 : -1;
    return direction * (a - b) || byName(left, right);
  });
}
