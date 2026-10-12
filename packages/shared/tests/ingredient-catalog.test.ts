import { describe, expect, it } from 'vitest';
import { defaultFoodDetails, foodDetailsSchema, savedFoodInputSchema } from '../src/foods.js';
import { defaultIngredientCatalog } from '../src/ingredient-catalog.js';
import { foodKcalPerGram } from '../src/meal-intake.js';

const petId = '0123456789abcdef01234567';
const suppliedRows = [
  ['Chicken breast (skinless, cooked)', 'protein', 165, 31, 3.6, 0],
  ['Turkey breast (skinless, cooked)', 'protein', 140, 30, 1.5, 0],
  ['Lean ground beef 90% (cooked)', 'protein', 217, 26, 12, 0],
  ['Beef liver (cooked)', 'protein', 175, 27, 5, 4],
  ['Whole egg (boiled)', 'protein', 155, 13, 11, 1],
  ['Salmon (cooked boneless)', 'protein', 206, 22, 12, 0],
  ['Sardines (canned in water)', 'protein', 140, 24, 4.5, 0],
  ['Plain yogurt (unsweetened)', 'protein', 61, 3.5, 3.3, 4.7],
  ['White rice (cooked)', 'carb', 130, 2.7, 0.3, 28],
  ['Brown rice (cooked)', 'carb', 123, 2.7, 1, 25.6],
  ['Sweet potato (baked no skin)', 'carb', 90, 2, 0.2, 20.7],
  ['Oatmeal (cooked in water)', 'carb', 71, 2.5, 1.5, 12],
  ['Pumpkin (plain canned)', 'carb', 34, 1.1, 0.3, 8.1],
  ['Carrots', 'vegetable', 41, 0.9, 0.2, 9.6],
  ['Green beans (cooked)', 'vegetable', 35, 1.9, 0.3, 7.9],
  ['Green peas', 'vegetable', 84, 5.4, 0.2, 15.6],
  ['Broccoli (cooked)', 'vegetable', 35, 2.4, 0.4, 7.2],
  ['Blueberries', 'fruit', 57, 0.7, 0.3, 14.5],
  ['Apple (no seeds or core)', 'fruit', 52, 0.3, 0.2, 13.8],
  ['Banana', 'fruit', 89, 1.1, 0.3, 22.8],
];

describe('provided ingredient catalog', () => {
  it('preserves every provided name, category and per-100 g nutrient value', () => {
    const rows = defaultIngredientCatalog.map(({ food, details }) => [
      food.name,
      details.category,
      details.nutritionPer100g.kcal,
      details.nutritionPer100g.proteinG,
      details.nutritionPer100g.fatG,
      details.nutritionPer100g.carbsG,
    ]);
    expect(rows).toEqual(suppliedRows);
    expect(new Set(defaultIngredientCatalog.map((food) => food.id)).size).toBe(20);
  });

  it('keeps composition estimates separate from complete diets and canine feeding energy', () => {
    for (const { food, details } of defaultIngredientCatalog) {
      expect(savedFoodInputSchema.safeParse({ petId, food, details }).success).toBe(true);
      expect(details.kind).toBe('ingredient');
      expect(food).toMatchObject({
        adequacy: 'supplemental',
        species: 'dog',
        lifeStage: 'unknown',
        calories: null,
        labelCheckedOn: null,
      });
      expect(food.labelSource).toContain('estimate');
      expect(foodKcalPerGram(food)).toBeNull();
    }
  });
});

describe('custom food nutrition metadata', () => {
  it('accepts optional https food photos while rejecting invalid links', () => {
    const details = defaultFoodDetails();
    expect(foodDetailsSchema.safeParse({ ...details, imageUrl: undefined }).success).toBe(true);
    expect(
      foodDetailsSchema.parse({ ...details, imageUrl: 'https://example.com/food.jpg' }).imageUrl,
    ).toBe('https://example.com/food.jpg');
    for (const imageUrl of ['http://example.com/food.jpg', 'not a URL'])
      expect(foodDetailsSchema.safeParse({ ...details, imageUrl }).success).toBe(false);
  });
  it('accepts older packaged inputs while preserving unknown nutrients as null', () => {
    const food = {
      ...defaultIngredientCatalog[0]!.food,
      adequacy: 'complete' as const,
      calories: 3500,
    };
    expect(savedFoodInputSchema.safeParse({ petId, food }).success).toBe(true);
    const defaults = defaultFoodDetails();
    expect(defaults).toEqual({
      kind: 'packaged',
      category: null,
      nutritionPer100g: { kcal: null, proteinG: null, fatG: null, carbsG: null },
      notes: '',
      imageUrl: null,
    });
    defaults.nutritionPer100g.proteinG = 10;
    expect(defaultFoodDetails().nutritionPer100g.proteinG).toBeNull();
  });

  it.each([
    { kcal: -1 },
    { kcal: 1001 },
    { kcal: Infinity },
    { proteinG: NaN },
    { fatG: -0.1 },
    { carbsG: 100.1 },
    { proteinG: 60, fatG: 30, carbsG: 20 },
    { proteinG: 80, fatG: 30, carbsG: null },
  ])('rejects invalid or impossible nutrient amounts: %j', (amounts) => {
    const details = defaultFoodDetails('ingredient');
    details.nutritionPer100g = { ...details.nutritionPer100g, ...amounts };
    expect(foodDetailsSchema.safeParse(details).success).toBe(false);
  });

  it('accepts zero and partial nutrient information without inferring missing amounts', () => {
    const details = defaultFoodDetails('ingredient');
    details.nutritionPer100g = { kcal: 0, proteinG: null, fatG: 0, carbsG: null };
    expect(foodDetailsSchema.parse(details).nutritionPer100g).toEqual(details.nutritionPer100g);
  });

  it('rejects excessive notes and metadata fields outside the contract', () => {
    expect(
      foodDetailsSchema.safeParse({ ...defaultFoodDetails(), notes: 'x'.repeat(501) }).success,
    ).toBe(false);
    expect(
      foodDetailsSchema.safeParse({ ...defaultFoodDetails(), ownerId: 'another-owner' }).success,
    ).toBe(false);
  });

  it('does not accept a complete-diet claim or feeding-energy conversion for ingredients', () => {
    const { food, details } = defaultIngredientCatalog[0]!;
    expect(
      savedFoodInputSchema.safeParse({ petId, food: { ...food, adequacy: 'complete' }, details })
        .success,
    ).toBe(false);
    expect(
      savedFoodInputSchema.safeParse({ petId, food: { ...food, calories: 1650 }, details }).success,
    ).toBe(false);
  });
});
