import { describe, expect, it } from 'vitest';
import type { FoodLabel } from '@vetify/planner-shared/foods';
import type { MealPlanInput } from '@vetify/planner-shared/meal-plans';
import {
  foodMatchesPet,
  foodWithAmounts,
  newFoodLabel,
  prefillPlanFood,
  sameFoodLabel,
} from './food-label';

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
