import { describe, expect, it } from 'vitest';
import { defaultFoodDetails, type FoodDetails, type FoodLabel } from '@vetify/planner-shared/foods';
import { defaultIngredientCatalog } from '@vetify/planner-shared/ingredient-catalog';
import { browseFoods, defaultFoodFilters } from './food-browse';

function food(
  name: string,
  kcal: number | null,
  category: FoodDetails['category'],
  mealTypes?: FoodDetails['mealTypes'],
) {
  return {
    food: { ...defaultIngredientCatalog[0].food, name },
    details: {
      ...defaultFoodDetails('ingredient'),
      category,
      mealTypes,
      nutritionPer100g: { kcal, proteinG: null, fatG: null, carbsG: null },
    },
  };
}
describe('food browsing', () => {
  it('combines name search, existing categories and explicit meal types', () => {
    const breakfast = food('Chicken for morning', 165, 'protein', ['breakfast', 'lunch']);
    const dinner = food('Chicken for evening', 170, 'protein', ['dinner']);
    const rice = food('Rice for morning', 130, 'carb', ['breakfast']);
    const untagged = food('Chicken without a meal type', 165, 'protein');
    const items = [breakfast, dinner, rice, untagged];
    expect(
      browseFoods(items, ' chicken ', {
        ...defaultFoodFilters,
        category: 'protein',
        mealType: 'breakfast',
      }),
    ).toEqual([breakfast]);
    expect(browseFoods(items, '', defaultFoodFilters)).toEqual(items);
    expect(untagged.details.mealTypes).toBeUndefined();
  });
  it('sorts by name without mutating input order', () => {
    const items = [
      food('Zucchini', 20, 'vegetable'),
      food('Apple', 52, 'fruit'),
      food('beef', 217, 'protein'),
    ];
    const original = [...items];
    expect(
      browseFoods(items, '', { ...defaultFoodFilters, sort: 'name-asc' }).map(
        (item) => item.food.name,
      ),
    ).toEqual(['Apple', 'beef', 'Zucchini']);
    expect(
      browseFoods(items, '', { ...defaultFoodFilters, sort: 'name-desc' }).map(
        (item) => item.food.name,
      ),
    ).toEqual(['Zucchini', 'beef', 'Apple']);
    expect(items).toEqual(original);
  });
  it('compares packaged calories per 100 g against ingredients and puts unknown values last', () => {
    const label = {
      ...defaultIngredientCatalog[0].food,
      adequacy: 'complete',
      calories: 100,
      calorieBasis: 'package',
      packageGrams: 50,
    } as FoodLabel;
    const packaged = { food: label, details: defaultFoodDetails() };
    const low = food('Low calorie ingredient', 40, 'vegetable');
    const unknown = food('Unknown calories', null, null);
    const zero = food('Zero calories', 0, 'other');
    const items = [unknown, packaged, low, zero];
    expect(browseFoods(items, '', { ...defaultFoodFilters, sort: 'calories-asc' })).toEqual([
      zero,
      low,
      packaged,
      unknown,
    ]);
    expect(browseFoods(items, '', { ...defaultFoodFilters, sort: 'calories-desc' })).toEqual([
      packaged,
      low,
      zero,
      unknown,
    ]);
  });
});
