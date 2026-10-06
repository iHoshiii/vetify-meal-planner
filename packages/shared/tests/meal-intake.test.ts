import {
  dailyIntake,
  foodKcalPerGram,
  GRAMS_PER_OUNCE,
  mealKcal,
} from '@vetify/planner-shared/meal-intake';
import type { FeedingLog, MealPlan } from '@vetify/planner-shared/meal-plans';
import { describe, expect, it } from 'vitest';

const plan = {
  mode: 'manual',
  food: { calorieBasis: 'kg', calories: 2500, packageGrams: null },
  preview: { dailyGrams: 100, dailyKcal: 250 },
  extrasKcal: 0,
} as MealPlan;

function log(grams: number, extrasKcal: number | null = 0): FeedingLog {
  return { actualGrams: grams, extrasKcal, status: grams ? 'fed' : 'skipped' } as FeedingLog;
}

describe('meal intake budget', () => {
  it('deducts logged food and extras from the daily target', () => {
    const result = dailyIntake(plan, [log(40), log(10, 5)]);
    expect(result.consumedKcal).toBe(130);
    expect(result.remainingKcal).toBe(120);
    expect(result.gramsEaten).toBe(50);
  });

  it('recalculates from the edited meal rather than accumulating its old amount', () => {
    expect(dailyIntake(plan, [log(40)]).remainingKcal).toBe(150);
    expect(dailyIntake(plan, [log(20)]).remainingKcal).toBe(200);
    expect(dailyIntake(plan, [log(0)]).remainingKcal).toBe(250);
    expect(dailyIntake(plan, [log(120)]).remainingKcal).toBe(-50);
  });

  it('converts weight ounces and package energy without rounding the input', () => {
    expect(GRAMS_PER_OUNCE).toBe(28.349523125);
    const packagePlan = {
      ...plan,
      food: { ...plan.food, calorieBasis: 'package', calories: 85, packageGrams: 100 },
    } as MealPlan;
    expect(foodKcalPerGram(packagePlan.food)).toBe(0.85);
    expect(mealKcal(packagePlan, log(GRAMS_PER_OUNCE))).toBeCloseTo(24.0971, 4);
  });

  it('does not claim an exact calorie balance when label or extras are unknown', () => {
    expect(dailyIntake(plan, [log(40, null)]).remainingKcal).toBeNull();
    const unknown = { ...plan, food: { ...plan.food, calories: null } } as MealPlan;
    expect(dailyIntake(unknown, [log(40)]).consumedKcal).toBeNull();
    expect(dailyIntake(unknown, [log(40)]).gramsRemaining).toBe(60);
  });

  it('derives a target for a saved manual plan with known calories', () => {
    const oldPlan = { ...plan, preview: { ...plan.preview, dailyKcal: null } } as MealPlan;
    expect(dailyIntake(oldPlan, [log(40)]).remainingKcal).toBe(150);
  });

  it('counts earlier meals on the same day with their original plan label', () => {
    const earlierPlan = {
      ...plan,
      food: { ...plan.food, calories: 5000 },
    } as MealPlan;
    const result = dailyIntake(plan, [log(20)], [{ plan: earlierPlan, logs: [log(10)] }]);
    expect(result.consumedKcal).toBe(100);
    expect(result.remainingKcal).toBe(150);
    expect(result.gramsRemaining).toBeNull();
  });
});
