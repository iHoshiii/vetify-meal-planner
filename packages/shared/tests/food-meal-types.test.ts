import { expect, it } from 'vitest';
import { defaultFoodDetails, foodDetailsSchema, savedFoodInputSchema } from '../src/foods.js';
import { defaultIngredientCatalog } from '../src/ingredient-catalog.js';

it('preserves optional meal tags on a saved food without assigning tags to legacy foods', () => {
  const original = defaultIngredientCatalog[0]!;
  const input = {
    petId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    food: original.food,
    details: { ...original.details, mealTypes: ['breakfast', 'lunch'] },
  };
  expect(savedFoodInputSchema.parse(input).details?.mealTypes).toEqual(['breakfast', 'lunch']);
  expect(foodDetailsSchema.parse(defaultFoodDetails()).mealTypes).toBeUndefined();
  expect(original.details.mealTypes).toBeUndefined();
});
it.each([['brunch'], ['lunch', 'lunch'], ['breakfast', 'lunch', 'dinner', 'snack', 'snack']])(
  'rejects invalid meal tags: %j',
  (...mealTypes) => {
    expect(foodDetailsSchema.safeParse({ ...defaultFoodDetails(), mealTypes }).success).toBe(false);
  },
);
