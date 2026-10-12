import type { FoodDetails, FoodLabel } from './foods.js';
import { foodKcalPerGram, mealKcal } from './meal-intake.js';
import type { FeedingLog, MealPlan } from './meal-plans.js';
import type {
  DietNutrition,
  DailyDietTargets,
  DietNutrient,
  DailyDietSummary,
} from './daily-diet.js';
const nutritionKeys = ['kcal', 'proteinG', 'fatG', 'carbsG'] as const;
export function portionNutrition(
  food: FoodLabel,
  details: FoodDetails,
  grams: number,
): DietNutrition {
  if (!Number.isFinite(grams) || grams < 0 || grams > 10000)
    throw new RangeError('Enter a food amount from 0 to 10,000 g.');
  // An explicitly skipped, zero-gram portion has no contribution, even when the composition of the food would be unknown for a nonzero amount.
  if (grams === 0) return { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 };
  const scale = grams / 100;
  const composition = details.nutritionPer100g;
  const labelledDensity = details.kind === 'packaged' ? foodKcalPerGram(food) : null;
  const nutrient = (value: number | null) => (value === null ? null : value * scale);
  return {
    // Prefer manufacturer pet-food energy to a separately entered composition estimate.
    kcal: labelledDensity === null ? nutrient(composition.kcal) : labelledDensity * grams,
    proteinG: nutrient(composition.proteinG),
    fatG: nutrient(composition.fatG),
    carbsG: nutrient(composition.carbsG),
  };
}

// Legacy meal logs have calorie labels, but no immutable macro composition.
export function legacyFeedingNutrition(plan: MealPlan, log: FeedingLog): DietNutrition {
  const empty = log.status === 'skipped' && log.actualGrams === 0 && log.extrasKcal === 0;
  return {
    kcal: mealKcal(plan, log),
    proteinG: empty ? 0 : null,
    fatG: empty ? 0 : null,
    carbsG: empty ? 0 : null,
  };
}

export function summarizeDailyDiet(
  entries: readonly (DietNutrition | { nutrition: DietNutrition })[],
  targets: Pick<DailyDietTargets, DietNutrient>,
): DailyDietSummary {
  return Object.fromEntries(
    nutritionKeys.map((key) => {
      let known = 0;
      let missingEntries = 0;
      for (const entry of entries) {
        const nutrition = 'nutrition' in entry ? entry.nutrition : entry;
        const value = nutrition[key];
        if (value === null || !Number.isFinite(value) || value < 0) missingEntries += 1;
        else known += value;
      }
      const total = missingEntries === 0 ? known : null;
      const target = targets[key];
      const remaining =
        total === null || target === null
          ? null
          : key === 'kcal'
            ? target - total
            : Math.max(0, target - total);
      return [key, { known, total, missingEntries, target, remaining }];
    }),
  ) as DailyDietSummary;
}
