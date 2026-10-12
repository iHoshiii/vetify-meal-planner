import { z } from 'zod';
import type { FoodDetails, FoodLabel } from './foods.js';
import { mealPlanInputSchema, type MealPlanInput } from './meal-plans.js';
import { validCalendarDay } from './planner-date.js';

export type DietNutrition = FoodDetails['nutritionPer100g'];

export const dietEntryInputSchema = z
  .object({
    requestId: z.string().uuid(),
    petId: z.string().regex(/^[a-f\d]{24}$/i),
    date: z.string().refine(validCalendarDay, 'Enter a real date'),
    source: z.enum(['saved', 'catalog']),
    foodId: z.string().trim().min(1).max(120),
    grams: z.number().finite().positive().max(10000),
  })
  .strict();

export type DietEntryInput = z.infer<typeof dietEntryInputSchema>;

// The API captures these values when adding an entry. Editing or deleting a food later must not change the composition recorded for an earlier portion.
export type DietEntry = DietEntryInput & {
  id: string;
  timeZone: string;
  food: FoodLabel;
  details: FoodDetails;
  nutrition: DietNutrition;
  createdAt: string;
};

export const dietAssessmentInputSchema = mealPlanInputSchema
  .pick({
    petId: true,
    weightKg: true,
    weightMeasuredOn: true,
    conditionScore: true,
    stableWeight: true,
    growing: true,
    healthConcern: true,
    prescribedDiet: true,
    appetiteChange: true,
    muscleCondition: true,
  })
  .strict();

export type DailyDietAssessment = Pick<
  MealPlanInput,
  | 'weightKg'
  | 'weightMeasuredOn'
  | 'conditionScore'
  | 'stableWeight'
  | 'growing'
  | 'healthConcern'
  | 'prescribedDiet'
  | 'appetiteChange'
  | 'muscleCondition'
>;
export type DietAssessmentInput = z.infer<typeof dietAssessmentInputSchema>;

export type DietNutrient = 'kcal' | 'proteinG' | 'fatG' | 'carbsG';

export type DailyDietTargets = DietNutrition & {
  carbsG: null;
  status: 'estimated' | 'needs-review';
  factor: number | null;
  rerKcal: number | null;
  weightKg: number | null;
  profile: 'fediaf2025.adult95' | 'fediaf2025.adult110' | 'fediaf2025.cat-adult75' | null;
  blockers: string[];
  notes: string[];
  reference: string;
  version: string;
  sources: { energy: string; nutrients: string };
};

export type DailyNutrientSummary = {
  // A subtotal of the entries with data, never a substitute for an incomplete total.
  known: number;
  total: number | null;
  missingEntries: number;
  target: number | null;
  remaining: number | null;
};
export type DailyDietSummary = Record<DietNutrient, DailyNutrientSummary>;

export { portionNutrition, legacyFeedingNutrition, summarizeDailyDiet } from './diet-nutrition.js';
export { estimateDailyDietTargets } from './diet-targets.js';
