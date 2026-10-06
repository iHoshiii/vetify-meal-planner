import { isShihTzu, SHIH_TZU_WEIGHT_ENTRY_MAX_KG, type Pet } from './pets.js';
import { petAge } from './pet-age.js';
import type { MealPlanInput, MealPlanPreview } from './meal-plans.js';
import { foodKcalPerGram } from './meal-intake.js';

function validDay(value: string): number | null {
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : null;
}

function splitGrams(total: number, count: number): number[] {
  const base = Math.floor((total * 10) / count) / 10;
  const portions = Array.from({ length: count }, () => base);
  portions[count - 1] = Math.round((total - base * (count - 1)) * 10) / 10;
  return portions;
}

export function previewMealPlan(pet: Pet, input: MealPlanInput, today: string): MealPlanPreview {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const measured = validDay(input.weightMeasuredOn);
  const current = validDay(today);
  if (measured === null || current === null || measured > current) {
    blockers.push('Enter a real weight measurement date that is not in the future.');
  }
  if (isShihTzu(pet.species, pet.breed) && input.weightKg > SHIH_TZU_WEIGHT_ENTRY_MAX_KG) {
    blockers.push('Check this weight against the pet and breed.');
  }
  if (new Set(input.mealTimes).size !== input.mealTimes.length) {
    blockers.push('Each meal needs a different time.');
  }
  if (input.food.adequacy !== 'complete') warnings.push('This food is not confirmed complete.');
  if (input.food.species !== pet.species) warnings.push('Check that this food suits this pet.');
  if (input.extrasKcal === null) warnings.push('Calories from treats and extras are unknown.');

  if (input.mode === 'manual') {
    if (input.manualDailyGrams === null) blockers.push('Enter the existing daily food amount.');
    if (measured !== null && current !== null && current - measured > 30 * 86400000) {
      warnings.push('This weight was measured more than 30 days ago.');
    }
    const dailyGrams = input.manualDailyGrams;
    const density = foodKcalPerGram(input.food);
    const foodKcal = dailyGrams !== null && density !== null ? dailyGrams * density : null;
    return {
      mode: 'manual',
      dailyGrams,
      dailyKcal:
        foodKcal !== null && input.extrasKcal !== null ? foodKcal + input.extrasKcal : null,
      foodKcal,
      factor: null,
      mealGrams: dailyGrams === null ? [] : splitGrams(dailyGrams, input.mealTimes.length),
      warnings: [...warnings, 'This amount was entered by you. Vetify has not calculated it.'],
      blockers,
    };
  }

  const age = petAge(pet, today);
  if (pet.species !== 'dog' && pet.species !== 'cat')
    blockers.push('Estimates support dogs and cats only.');
  if (age.years < (pet.species === 'dog' ? 2 : 1) || input.growing) {
    blockers.push('Growing pets need an individual feeding plan.');
  }
  if (pet.pregnantOrNursing !== 'no')
    blockers.push('Pregnancy or nursing needs an individual plan.');
  if (pet.feedingGoal !== 'maintain')
    blockers.push('This estimate is for weight maintenance only.');
  if (
    pet.healthConditions.length ||
    pet.allergies.length ||
    input.healthConcern ||
    input.prescribedDiet
  ) {
    blockers.push('Health conditions or food reactions need a reviewed food plan.');
  }
  if (input.appetiteChange || !input.stableWeight)
    blockers.push('Recent changes need a feeding review.');
  if (input.conditionScore !== 4 && input.conditionScore !== 5) {
    blockers.push('Confirm an ideal body condition score of 4 or 5 out of 9.');
  }
  if (pet.neuterStatus === 'prefer_not_to_say' || pet.activityLevel !== 'moderate') {
    blockers.push('A known neuter status and moderate activity are needed for this estimate.');
  }
  if (measured !== null && current !== null && current - measured > 30 * 86400000) {
    blockers.push('Measure the pet again before estimating a portion.');
  }
  if (
    input.food.adequacy !== 'complete' ||
    input.food.species !== pet.species ||
    !['adult', 'all'].includes(input.food.lifeStage) ||
    input.food.calories === null ||
    (input.food.calorieBasis === 'package' && input.food.packageGrams === null)
  ) {
    blockers.push('Use a suitable complete adult food with its label calories.');
  }
  const labelDate = input.food.labelCheckedOn ? validDay(input.food.labelCheckedOn) : null;
  if (!input.food.labelSource || labelDate === null || current === null || labelDate > current) {
    blockers.push('Record the calorie label source and date checked.');
  }
  if (input.extrasKcal === null)
    blockers.push('Enter daily calories from treats, including 0 if none.');
  if (blockers.length) {
    return {
      mode: 'estimate',
      dailyGrams: null,
      dailyKcal: null,
      foodKcal: null,
      factor: null,
      mealGrams: [],
      warnings,
      blockers,
    };
  }

  // AAHA adult maintenance factor ranges: https://www.aaha.org/resources/2021-aaha-nutrition-and-weight-management-guidelines/weight-reduction-in-the-obese-pet/
  const factor =
    pet.species === 'dog'
      ? pet.neuterStatus === 'yes'
        ? 1.4
        : 1.6
      : pet.neuterStatus === 'yes'
        ? 1.2
        : 1.4;
  const dailyKcal = Math.round(70 * input.weightKg ** 0.75 * factor);
  const extrasKcal = input.extrasKcal ?? 0;
  if (extrasKcal >= dailyKcal) blockers.push('Extras use the entire estimated calorie budget.');
  if (extrasKcal > dailyKcal * 0.1) {
    blockers.push('Treats exceed 10% of estimated daily calories. Review the food plan.');
  }
  if (blockers.length)
    return {
      mode: 'estimate',
      dailyGrams: null,
      dailyKcal,
      foodKcal: null,
      factor,
      mealGrams: [],
      warnings,
      blockers,
    };

  const foodKcal = dailyKcal - extrasKcal;
  const kcalPerGram =
    input.food.calorieBasis === 'kg'
      ? (input.food.calories ?? 1) / 1000
      : (input.food.calories ?? 1) / (input.food.packageGrams ?? 1);
  const dailyGrams = Math.round((foodKcal / kcalPerGram) * 10) / 10;
  return {
    mode: 'estimate',
    dailyGrams,
    dailyKcal,
    foodKcal,
    factor,
    mealGrams: splitGrams(dailyGrams, input.mealTimes.length),
    warnings,
    blockers,
  };
}
