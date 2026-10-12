import { randomUUID } from 'expo-crypto';
import { z } from 'zod';
import {
  mealPlanInputSchema,
  type MealPlan,
  type MealPlanInput,
} from '@vetify/planner-shared/meal-plans';
import type { Pet } from '@vetify/planner-shared/pets';
import { readPlanDraft, removePlanDraft, writePlanDraft } from '../../storage/plan-drafts';

const number = z.number().finite().nullable();
const draftSchema = mealPlanInputSchema.extend({
  weightKg: z.number().finite(),
  weightMeasuredOn: z.string().max(10),
  extrasKcal: number,
  manualDailyGrams: number,
  mealTimes: z.array(z.string().max(5)).min(1).max(6),
  food: mealPlanInputSchema.shape.food.extend({
    name: z.string().max(120),
    calories: number,
    packageGrams: number,
    labelCheckedOn: z.string().max(10).nullable(),
  }),
});
export function storeDraft(key: string, input: MealPlanInput): Promise<void> {
  return writePlanDraft(key, JSON.stringify(input));
}

export function removeDraft(key: string): Promise<void> {
  return removePlanDraft(key);
}

export async function loadDraft(key: string, petId: string): Promise<MealPlanInput | null> {
  const stored = await readPlanDraft(key);
  if (!stored) return null;
  try {
    const parsed = draftSchema.safeParse(JSON.parse(stored));
    return parsed.success && parsed.data.petId === petId ? parsed.data : null;
  } catch {
    return null;
  }
}

export function initial(pet: Pet, existingPlan?: MealPlan): MealPlanInput {
  const requestId = randomUUID();
  if (existingPlan) return mealPlanInputSchema.parse({ ...existingPlan, requestId });
  return {
    requestId,
    petId: pet.id,
    mode: 'manual',
    weightKg: pet.weightKg,
    weightMeasuredOn: '',
    conditionScore: null,
    stableWeight: false,
    growing: false,
    healthConcern: false,
    prescribedDiet: false,
    appetiteChange: false,
    food: {
      name: pet.currentFood,
      form: 'dry',
      adequacy: 'unknown',
      species: pet.species,
      lifeStage: 'unknown',
      calorieBasis: 'kg',
      calories: null,
      packageGrams: null,
      labelSource: '',
      labelCheckedOn: null,
    },
    extrasKcal: null,
    manualDailyGrams: null,
    mealTimes: ['08:00', '18:00'],
  };
}
