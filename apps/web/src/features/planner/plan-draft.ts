import { draftKey } from '@/auth/session';
import type { MealPlan, MealPlanInput } from '@vetify/planner-shared/meal-plans';
import type { Pet } from '@vetify/planner-shared/pets';

export function initial(pet: Pet, existingPlan?: MealPlan): MealPlanInput {
  const draft = sessionStorage.getItem(draftKey(pet.id));
  if (draft) {
    try {
      const value = JSON.parse(draft) as Partial<MealPlanInput>;
      if (
        value.petId === pet.id &&
        typeof value.mode === 'string' &&
        typeof value.weightKg === 'number' &&
        value.food &&
        Array.isArray(value.mealTimes)
      ) {
        return value as MealPlanInput;
      }
    } catch {
      // Ignore a damaged local draft.
    }
  }
  if (existingPlan) {
    const {
      petId,
      mode,
      weightKg,
      weightMeasuredOn,
      conditionScore,
      stableWeight,
      growing,
      healthConcern,
      prescribedDiet,
      appetiteChange,
      food,
      extrasKcal,
      manualDailyGrams,
      mealTimes,
    } = existingPlan;
    return {
      requestId: crypto.randomUUID(),
      petId,
      mode,
      weightKg,
      weightMeasuredOn,
      conditionScore,
      stableWeight,
      growing,
      healthConcern,
      prescribedDiet,
      appetiteChange,
      food,
      extrasKcal,
      manualDailyGrams,
      mealTimes,
    };
  }
  return {
    requestId: crypto.randomUUID(),
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
