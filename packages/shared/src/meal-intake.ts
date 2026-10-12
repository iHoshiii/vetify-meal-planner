import type { FeedingLog, MealPlan } from './meal-plans.js';

export const GRAMS_PER_OUNCE = 28.349523125;

export function foodKcalPerGram(food: MealPlan['food']): number | null {
  if (food.calories === null) return null;
  if (food.calorieBasis === 'kg') return food.calories / 1000;
  if (food.packageGrams === null) return null;
  return food.calories / food.packageGrams;
}

export function mealKcal(plan: MealPlan, log: FeedingLog): number | null {
  const density = foodKcalPerGram(plan.food);
  if (log.extrasKcal === null || (log.actualGrams && density === null)) return null;
  return (log.actualGrams ?? 0) * (density ?? 0) + log.extrasKcal;
}

export function dailyIntake(
  plan: MealPlan,
  logs: FeedingLog[],
  earlier: Array<{ plan: MealPlan; logs: FeedingLog[] }> = [],
) {
  const density = foodKcalPerGram(plan.food);
  const targetKcal =
    plan.preview.dailyKcal ??
    (plan.mode === 'manual' &&
    density !== null &&
    plan.preview.dailyGrams !== null &&
    plan.extrasKcal !== null
      ? plan.preview.dailyGrams * density + plan.extrasKcal
      : null);
  const entries = [{ plan, logs }, ...earlier];
  const gramsEaten = entries.reduce(
    (sum, entry) => sum + entry.logs.reduce((total, log) => total + (log.actualGrams ?? 0), 0),
    0,
  );
  const calories = entries.flatMap((entry) => entry.logs.map((log) => mealKcal(entry.plan, log)));
  const hasEarlierLogs = earlier.some((entry) => entry.logs.length > 0);
  const consumedKcal = calories.some((value) => value === null)
    ? null
    : calories.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return {
    targetKcal,
    consumedKcal,
    remainingKcal: targetKcal !== null && consumedKcal !== null ? targetKcal - consumedKcal : null,
    gramsEaten,
    gramsRemaining:
      plan.preview.dailyGrams === null || hasEarlierLogs
        ? null
        : plan.preview.dailyGrams - gramsEaten,
  };
}

export function validPlanDay(value: string): number | null {
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : null;
}

export function splitMealGrams(total: number, count: number): number[] {
  const base = Math.floor((total * 10) / count) / 10;
  const portions = Array.from({ length: count }, () => base);
  portions[count - 1] = Math.round((total - base * (count - 1)) * 10) / 10;
  return portions;
}
