import { describe, expect, it } from 'vitest';
import {
  defaultFoodDetails,
  savedFoodInputSchema,
  type CatalogFood,
  type FoodLabel,
} from '@vetify/planner-shared/foods';
import { defaultIngredientCatalog } from '@vetify/planner-shared/ingredient-catalog';
import type { MealPlanInput } from '@vetify/planner-shared/meal-plans';
import {
  foodMatchesPet,
  foodWithAmounts,
  newFoodLabel,
  prefillPlanFood,
  sameFoodLabel,
  catalogForPet,
  cloneFoodDetails,
  detailsWithNutrition,
  filterFoods,
  ingredientLabel,
  newFoodDetails,
  nutritionText,
  nutritionValues,
  withFoodDetails,
} from '../food-label';

describe('saved food selection', () => {
  it('copies only the food label without changing plan inputs or sharing its mutable object', () => {
    const input = {
      food: newFoodLabel({ species: 'dog' }),
      petId: 'pet-a',
      mode: 'manual',
      weightKg: 6.2,
      weightMeasuredOn: '2026-10-10',
      growing: true,
      healthConcern: true,
      extrasKcal: 15,
      manualDailyGrams: 200,
      mealTimes: ['08:00', '18:00'],
    } as MealPlanInput;
    const food = {
      ...newFoodLabel({ species: 'dog' }),
      name: 'Owner-entered package label',
      calories: 3500,
    };
    const next = prefillPlanFood(input, food);
    expect(next).toEqual({ ...input, food });
    expect(next.food).not.toBe(food);
    expect(next.food).not.toBe(input.food);
    next.food.name = 'Changed draft';
    expect(food.name).toBe('Owner-entered package label');
    expect(input.food.name).toBe('');
    expect(next.mealTimes).toBe(input.mealTimes);
  });

  it('preserves unknown label amounts instead of converting blanks to zero', () => {
    const food = newFoodLabel({ species: 'dog' });
    expect(foodWithAmounts(food, ' ', '')).toMatchObject({ calories: null, packageGrams: null });
    expect(foodWithAmounts(food, '85', '90')).toMatchObject({ calories: 85, packageGrams: 90 });
    expect(foodWithAmounts(food, 'not a number', '').calories).toBeNaN();
  });

  it('does not treat a different species as matching or rewrite its saved label', () => {
    const catFood = { ...newFoodLabel({ species: 'cat' }), name: 'Cat food' };
    expect(foodMatchesPet(catFood, { species: 'dog' })).toBe(false);
    expect(catFood.species).toBe('cat');
    expect(foodMatchesPet(catFood, { species: 'cat' })).toBe(true);
  });

  it('recognizes label equality regardless of object key order and includes energy/source metadata', () => {
    const food = { ...newFoodLabel({ species: 'dog' }), name: 'Dry food' };
    const reordered = Object.fromEntries(Object.entries(food).reverse()) as FoodLabel;
    expect(sameFoodLabel(food, reordered)).toBe(true);
    expect(sameFoodLabel(food, { ...food, calories: 3500 })).toBe(false);
    expect(sameFoodLabel(food, { ...food, labelCheckedOn: '2026-10-09' })).toBe(false);
  });
});

describe('ingredient library', () => {
  it('normalizes a legacy saved label to packaged metadata while preserving explicit ingredient details', () => {
    const food = { ...newFoodLabel({ species: 'dog' }), name: 'Legacy label' };
    const legacy = withFoodDetails({ id: 'old', food });
    expect(legacy).toMatchObject({
      id: 'old',
      food,
      details: { kind: 'packaged', nutritionPer100g: { kcal: null } },
    });
    expect(withFoodDetails(defaultIngredientCatalog[0]).details).toBe(
      defaultIngredientCatalog[0].details,
    );
  });
  it('starts custom foods as ingredients with unknown amounts and no complete-diet claim', () => {
    const details = newFoodDetails();
    expect(details).toMatchObject({
      kind: 'ingredient',
      category: null,
      nutritionPer100g: { kcal: null, proteinG: null, fatG: null, carbsG: null },
    });
    const food = ingredientLabel({
      ...newFoodLabel({ species: 'dog' }),
      name: 'Custom ingredient',
      adequacy: 'complete',
      calories: 3500,
      packageGrams: 90,
    });
    expect(food).toMatchObject({
      form: 'other',
      adequacy: 'supplemental',
      calories: null,
      packageGrams: null,
    });
    expect(
      savedFoodInputSchema.safeParse({ petId: 'aaaaaaaaaaaaaaaaaaaaaaaa', food, details }).success,
    ).toBe(true);
  });

  it('filters all 20 actual catalogue entries by category and a trimmed case-insensitive name', () => {
    expect(filterFoods(defaultIngredientCatalog, '', 'all')).toHaveLength(20);
    expect(filterFoods(defaultIngredientCatalog, '', 'protein')).toHaveLength(8);
    expect(filterFoods(defaultIngredientCatalog, '', 'carb')).toHaveLength(5);
    expect(filterFoods(defaultIngredientCatalog, '', 'vegetable')).toHaveLength(4);
    expect(filterFoods(defaultIngredientCatalog, '', 'fruit')).toHaveLength(3);
    expect(
      filterFoods(defaultIngredientCatalog, '  RICE ', 'carb').map((item) => item.food.name),
    ).toEqual(['White rice (cooked)', 'Brown rice (cooked)']);
    expect(filterFoods(defaultIngredientCatalog, 'rice', 'protein')).toHaveLength(0);
  });

  it('shows the supplied dog ingredients only for dogs', () => {
    expect(catalogForPet(defaultIngredientCatalog, { species: 'dog' })).toHaveLength(20);
    expect(catalogForPet(defaultIngredientCatalog, { species: 'cat' })).toHaveLength(0);
    expect(catalogForPet(defaultIngredientCatalog, { species: 'other' })).toHaveLength(0);
  });

  it('isolates future ingredient and packaged catalogue entries by exact dog, cat or other species', () => {
    const catalog: CatalogFood[] = (['dog', 'cat', 'other'] as const).flatMap((species) =>
      (['ingredient', 'packaged'] as const).map((kind) => ({
        id: `${species}-${kind}`,
        food: {
          ...newFoodLabel({ species }),
          name: `${species} ${kind}`,
        },
        details: defaultFoodDetails(kind),
      })),
    );
    for (const species of ['dog', 'cat', 'other'] as const) {
      const filtered = catalogForPet(catalog, { species });
      expect(filtered.map((item) => item.id)).toEqual([
        `${species}-ingredient`,
        `${species}-packaged`,
      ]);
      expect(filtered[0]).toBe(catalog.find((item) => item.id === `${species}-ingredient`));
    }
    expect(catalog).toHaveLength(6);
    expect(catalog.filter((item) => item.food.species === 'cat')).toHaveLength(2);
  });

  it('copies exact catalogue nutrients without sharing the nested object when edited', () => {
    const original = defaultIngredientCatalog[0];
    const draft = cloneFoodDetails(original.details);
    expect(nutritionValues(draft)).toEqual({
      kcal: '165',
      proteinG: '31',
      fatG: '3.6',
      carbsG: '0',
    });
    expect(draft.nutritionPer100g).not.toBe(original.details.nutritionPer100g);
    draft.nutritionPer100g.proteinG = 30;
    draft.notes = 'Custom preparation';
    expect(original.details.nutritionPer100g.proteinG).toBe(31);
    expect(original.details.notes).not.toBe('Custom preparation');
  });

  it('keeps a known zero separate from an unknown blank on entry, reload and display', () => {
    const details = detailsWithNutrition(newFoodDetails(), {
      kcal: '',
      proteinG: '0',
      fatG: '  ',
      carbsG: '4.7',
    });
    expect(details.nutritionPer100g).toEqual({ kcal: null, proteinG: 0, fatG: null, carbsG: 4.7 });
    expect(nutritionValues(details)).toEqual({ kcal: '', proteinG: '0', fatG: '', carbsG: '4.7' });
    expect(nutritionText(0, ' g')).toBe('0 g');
    expect(nutritionText(null, ' g')).toBe('Unknown');
  });

  it('rejects malformed or impossible ingredient nutrition while keeping label energy unknown', () => {
    const food = ingredientLabel({
      ...newFoodLabel({ species: 'dog' }),
      name: 'Custom ingredient',
    });
    const input = { petId: 'aaaaaaaaaaaaaaaaaaaaaaaa', food };
    const malformed = detailsWithNutrition(newFoodDetails(), {
      kcal: 'not a number',
      proteinG: '',
      fatG: '',
      carbsG: '',
    });
    expect(savedFoodInputSchema.safeParse({ ...input, details: malformed }).success).toBe(false);
    const excessive = detailsWithNutrition(newFoodDetails(), {
      kcal: '165',
      proteinG: '60',
      fatG: '30',
      carbsG: '20',
    });
    expect(savedFoodInputSchema.safeParse({ ...input, details: excessive }).success).toBe(false);
    const valid = detailsWithNutrition(newFoodDetails(), {
      kcal: '165',
      proteinG: '31',
      fatG: '3.6',
      carbsG: '0',
    });
    const parsed = savedFoodInputSchema.parse({ ...input, details: valid });
    expect(parsed.food.calories).toBeNull();
    expect(parsed.details?.nutritionPer100g.kcal).toBe(165);
  });
});
