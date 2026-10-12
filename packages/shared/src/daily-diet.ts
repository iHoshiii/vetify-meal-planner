import { z } from 'zod';
import type { FoodDetails, FoodLabel } from './foods.js';
import { foodKcalPerGram, mealKcal } from './meal-intake.js';
import {
  mealPlanInputSchema,
  type FeedingLog,
  type MealPlan,
  type MealPlanInput,
} from './meal-plans.js';
import { petAge } from './pet-age.js';
import { isShihTzu, SHIH_TZU_WEIGHT_ENTRY_MAX_KG, type Pet } from './pets.js';
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

// The API captures these values when adding an entry. Editing or deleting a food
// later must not change the composition recorded for an earlier portion.
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

const nutritionKeys = ['kcal', 'proteinG', 'fatG', 'carbsG'] as const;
export type DietNutrient = (typeof nutritionKeys)[number];

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

/** Scale explicit composition values. Do not reconstruct energy from P/F/C. */
export function portionNutrition(
  food: FoodLabel,
  details: FoodDetails,
  grams: number,
): DietNutrition {
  if (!Number.isFinite(grams) || grams < 0 || grams > 10000)
    throw new RangeError('Enter a food amount from 0 to 10,000 g.');
  // An explicitly skipped, zero-gram portion has no contribution, even when the
  // composition of the food would be unknown for a nonzero amount.
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

/** Legacy meal logs have calorie labels, but no immutable macro composition. */
export function legacyFeedingNutrition(plan: MealPlan, log: FeedingLog): DietNutrition {
  const empty = log.status === 'skipped' && log.actualGrams === 0 && log.extrasKcal === 0;
  return {
    kcal: mealKcal(plan, log),
    proteinG: empty ? 0 : null,
    fatG: empty ? 0 : null,
    carbsG: empty ? 0 : null,
  };
}

const energySource =
  'https://www.aaha.org/resources/2021-aaha-nutrition-and-weight-management-guidelines/weight-reduction-in-the-obese-pet/';
const nutrientSource =
  'https://europeanpetfood.org/wp-content/uploads/2025/09/FEDIAF-Nutritional-Guidelines_2025-ONLINE.pdf';

/**
 * Current-profile, ordinary adult maintenance starting estimate only. The
 * assessment supplies measured weight and explicitly confirmed screening flags;
 * a bare pet profile must not silently become a healthy, growth-complete finding.
 */
export function estimateDailyDietTargets(
  pet: Pet,
  today: string,
  assessment: DailyDietAssessment | null,
): DailyDietTargets {
  const blockers: string[] = [];
  const feline = pet.species === 'cat';
  const result: DailyDietTargets = {
    kcal: null,
    proteinG: null,
    fatG: null,
    carbsG: null,
    status: 'needs-review',
    factor: null,
    rerKcal: null,
    weightKg: null,
    profile: null,
    blockers,
    notes: [
      'Energy is a starting estimate. Reassess it using weight and body condition.',
      'Protein and fat are profile-derived minimum comparisons, not a complete recipe.',
      `There is no universal carbohydrate target in the selected ${feline ? 'feline' : 'canine'} profile.`,
      'Food composition estimates do not establish that the whole diet is complete.',
      ...(feline
        ? [
            'Vetify retains the conservative Adult Cat 75 comparison; this is a product policy, not a published FEDIAF profile-selection rule.',
            'A food meeting the Adult Cat 100 profile can fall below this protein comparison without being deficient.',
          ]
        : []),
    ],
    reference: 'AAHA 2021 · FEDIAF September 2025',
    version: feline ? 'vetify-cat-maintenance-v1' : 'vetify-dog-maintenance-v1',
    sources: { energy: energySource, nutrients: nutrientSource },
  };
  if (!validCalendarDay(today)) blockers.push('Enter a real assessment date.');
  if (pet.species !== 'dog' && !feline)
    blockers.push('Automatic daily targets support adult dogs and cats only.');
  if (pet.pregnantOrNursing !== 'no')
    blockers.push('Pregnancy, nursing or an unknown reproductive status needs a reviewed plan.');
  if (pet.feedingGoal !== 'maintain')
    blockers.push('Automatic targets are for weight maintenance only.');
  if (pet.healthConditions.length || pet.allergies.length)
    blockers.push('Health conditions or food reactions need a reviewed food plan.');
  if (pet.neuterStatus === 'prefer_not_to_say')
    blockers.push('Confirm the neuter status before estimating a daily target.');
  if (pet.activityLevel !== 'moderate')
    blockers.push('This starting estimate requires ordinary, moderate activity.');
  if (!assessment) {
    blockers.push('Confirm a current weight and feeding assessment to estimate daily targets.');
    return result;
  }
  const parsedAssessment = dietAssessmentInputSchema.safeParse({ petId: pet.id, ...assessment });
  if (!parsedAssessment.success) {
    blockers.push('Check the weight, measurement date and assessment answers.');
    return result;
  }
  // Reuse the existing unit/entry plausibility check. It is a request to verify
  // the measurement, not a diagnosis or an ideal-weight value for this breed.
  if (isShihTzu(pet.species, pet.breed) && assessment.weightKg > SHIH_TZU_WEIGHT_ENTRY_MAX_KG)
    blockers.push(
      'Check the weight and units, then weigh the dog again before estimating targets.',
    );
  if (validCalendarDay(today)) {
    const age = petAge(pet, today);
    // Conservative MVP boundary; age alone does not prove growth completion.
    if (age.years < (feline ? 1 : 2) || assessment.growing)
      blockers.push(
        `Growing or young ${feline ? 'cats' : 'dogs'} need an individual reviewed feeding plan.`,
      );
    if (feline && age.years >= 7)
      blockers.push('Cats aged seven or older need an individual feeding review in this release.');
    const measurement = Date.parse(`${assessment.weightMeasuredOn}T00:00:00.000Z`);
    const current = Date.parse(`${today}T00:00:00.000Z`);
    if (measurement > current) blockers.push('The weight measurement cannot be in the future.');
    else if (current - measurement > 30 * 86400000)
      blockers.push(`Measure the ${feline ? 'cat' : 'dog'} again before estimating daily targets.`);
  }
  if (assessment.healthConcern || assessment.prescribedDiet)
    blockers.push('Health concerns or a prescribed diet need a reviewed feeding plan.');
  if (assessment.appetiteChange || !assessment.stableWeight)
    blockers.push('Recent appetite or weight changes need a feeding review.');
  if (assessment.conditionScore !== 4 && assessment.conditionScore !== 5)
    blockers.push('Confirm a body condition score of 4 or 5 out of 9.');
  if (feline && assessment.muscleCondition !== 'normal')
    blockers.push(
      'Confirm normal muscle condition; muscle loss needs an individual feeding review.',
    );
  if (blockers.length) return result;

  // One method, never a multiplied age/size/activity/neuter stack. Lower ends of
  // AAHA adult ranges match the existing conservative Vetify research default.
  const factor = feline
    ? pet.neuterStatus === 'yes'
      ? 1.2
      : 1.4
    : pet.neuterStatus === 'yes'
      ? 1.4
      : 1.6;
  const metabolicWeight = assessment.weightKg ** 0.75;
  const rerKcal = 70 * metabolicWeight;
  const kcal = rerKcal * factor;
  if (feline) {
    // The chosen AAHA energy method uses W^.75. The feline FEDIAF food
    // reference uses W^.67; these exponents and methods must not be combined.
    const felineEnergyCoefficient = kcal / assessment.weightKg ** 0.67;
    if (felineEnergyCoefficient < 75) {
      blockers.push('This energy intake needs a reviewed feline nutrient-density profile.');
      return result;
    }
    // Retaining Adult Cat 75 above its coefficient is a disclosed conservative
    // Vetify comparison policy, not a FEDIAF selection rule or adequacy claim.
    return {
      ...result,
      kcal,
      proteinG: (83.3 * kcal) / 1000,
      fatG: (22.5 * kcal) / 1000,
      status: 'estimated',
      factor,
      rerKcal,
      weightKg: assessment.weightKg,
      profile: 'fediaf2025.cat-adult75',
      reference: `${result.reference} · Adult Cat 75`,
    };
  }
  const energyCoefficient = 70 * factor;
  // The A95 mapping at 98 is Vetify's disclosed conservative profile policy,
  // not a newly published FEDIAF threshold or an adequacy approval.
  if (energyCoefficient < 95) {
    blockers.push('This energy intake needs a reviewed nutrient-density profile.');
    return result;
  }
  const profile = energyCoefficient < 110 ? 'fediaf2025.adult95' : 'fediaf2025.adult110';
  const proteinPer1000Kcal = profile === 'fediaf2025.adult95' ? 52.1 : 45;
  return {
    ...result,
    kcal,
    proteinG: (proteinPer1000Kcal * kcal) / 1000,
    fatG: (13.75 * kcal) / 1000,
    status: 'estimated',
    factor,
    rerKcal,
    weightKg: assessment.weightKg,
    profile,
    reference: `${result.reference} · ${profile.endsWith('95') ? 'Adult 95' : 'Adult 110'}`,
  };
}

/**
 * Totals describe logged entries, not proof of everything the pet consumed.
 * Legacy feeding entries can participate only once, as nullable nutrition rows.
 */
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
