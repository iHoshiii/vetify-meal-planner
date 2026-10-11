import { describe, expect, it } from 'vitest';
import {
  dietAssessmentInputSchema,
  dietEntryInputSchema,
  estimateDailyDietTargets,
  legacyFeedingNutrition,
  portionNutrition,
  summarizeDailyDiet,
  type DailyDietAssessment,
  type DietNutrition,
} from '../src/daily-diet.js';
import { defaultFoodDetails, type FoodDetails, type FoodLabel } from '../src/foods.js';
import type { FeedingLog, MealPlan } from '../src/meal-plans.js';
import type { Pet } from '../src/pets.js';

const petId = '0123456789abcdef01234567';
const today = '2026-10-01';
const food: FoodLabel = {
  name: 'Cooked chicken breast',
  form: 'other',
  adequacy: 'supplemental',
  species: 'dog',
  lifeStage: 'unknown',
  calorieBasis: 'kg',
  calories: null,
  packageGrams: null,
  labelSource: 'Owner-provided composition estimate',
  labelCheckedOn: null,
};
const details: FoodDetails = {
  kind: 'ingredient',
  category: 'protein',
  nutritionPer100g: { kcal: 165, proteinG: 31, fatG: 3.6, carbsG: 0 },
  notes: 'Cook fully; serve plain, skinless and boneless.',
};
const pet: Pet = {
  id: petId,
  name: 'Milo',
  species: 'dog',
  otherSpecies: '',
  breed: 'Mixed',
  birthMonth: '2023-01',
  sex: 'male',
  neuterStatus: 'yes',
  weightKg: 6,
  allergies: [],
  healthConditions: [],
  foodPreferences: '',
  currentFood: '',
  activityLevel: 'moderate',
  bodyConditionScore: null,
  feedingGoal: 'maintain',
  pregnantOrNursing: 'no',
  ageYearsAtReference: 3,
  ageMonthsAtReference: 0,
  registeredOn: '2026-01-01',
  ageReferenceOn: '2026-01-01',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const assessment: DailyDietAssessment = {
  weightKg: 6,
  weightMeasuredOn: today,
  conditionScore: 5,
  stableWeight: true,
  growing: false,
  healthConcern: false,
  prescribedDiet: false,
  appetiteChange: false,
};
const targets = { kcal: 430, proteinG: 19.35, fatG: 5.9125, carbsG: null };

const plan: MealPlan = {
  ...assessment,
  id: 'fedcba987654321001234567',
  requestId: '123e4567-e89b-42d3-a456-426614174000',
  ownerId: 'owner',
  petId,
  petName: pet.name,
  petWeightKg: 6,
  mode: 'estimate',
  food: { ...food, calories: 3700, adequacy: 'complete', lifeStage: 'adult' },
  extrasKcal: 0,
  manualDailyGrams: null,
  mealTimes: ['08:00', '18:00'],
  preview: {
    mode: 'estimate',
    dailyGrams: 100,
    dailyKcal: 370,
    foodKcal: 370,
    factor: 1.4,
    mealGrams: [50, 50],
    blockers: [],
    warnings: [],
  },
  version: 1,
  timeZone: 'Asia/Singapore',
  activeFrom: `${today}T00:00:00.000Z`,
  endedAt: null,
  createdAt: `${today}T00:00:00.000Z`,
};
const feedingLog: FeedingLog = {
  id: '012345670123456701234567',
  planId: plan.id,
  date: today,
  mealIndex: 0,
  status: 'fed',
  actualGrams: 50,
  extrasKcal: 0,
  note: '',
  recordedAt: `${today}T08:00:00.000Z`,
};

describe('immutable portion contribution arithmetic', () => {
  it('scales the provided 100 g values to a 50 g portion without rounding away data', () => {
    expect(portionNutrition(food, details, 50)).toEqual({
      kcal: 82.5,
      proteinG: 15.5,
      fatG: 1.8,
      carbsG: 0,
    });
  });

  it('supports weighed fractional grams and leaves the composition source unchanged', () => {
    const composition = {
      ...details,
      nutritionPer100g: { kcal: 130, proteinG: 2.7, fatG: 0.3, carbsG: 28 },
    };
    const before = structuredClone(composition);
    const contribution = portionNutrition(food, composition, 37.5);
    expect(contribution.kcal).toBe(48.75);
    expect(contribution.proteinG).toBeCloseTo(1.0125, 12);
    expect(contribution.fatG).toBeCloseTo(0.1125, 12);
    expect(contribution.carbsG).toBe(10.5);
    expect(composition).toEqual(before);
    composition.nutritionPer100g.kcal = 999;
    expect(contribution.kcal).toBe(48.75);
  });

  it('preserves unknown nutrients independently of an explicitly measured zero', () => {
    const unknown: FoodDetails = {
      ...defaultFoodDetails('ingredient'),
      nutritionPer100g: { kcal: 80, proteinG: null, fatG: 0, carbsG: null },
    };
    expect(portionNutrition(food, unknown, 25)).toEqual({
      kcal: 20,
      proteinG: null,
      fatG: 0,
      carbsG: null,
    });
  });

  it('prefers the packaged manufacturer kcal/kg label to composition calorie estimates', () => {
    const packaged = { ...food, calories: 3700 };
    const composition = { ...details, kind: 'packaged' as const };
    expect(portionNutrition(packaged, composition, 50)).toEqual({
      kcal: 185,
      proteinG: 15.5,
      fatG: 1.8,
      carbsG: 0,
    });
  });

  it('converts packaged calories using the stated package weight', () => {
    const packaged = {
      ...food,
      calories: 360,
      calorieBasis: 'package' as const,
      packageGrams: 400,
    };
    expect(portionNutrition(packaged, defaultFoodDetails(), 200)).toEqual({
      kcal: 180,
      proteinG: null,
      fatG: null,
      carbsG: null,
    });
  });

  it('does not invent calories from known protein, fat and carbohydrate values', () => {
    const composition = {
      ...details,
      nutritionPer100g: { kcal: null, proteinG: 10, fatG: 5, carbsG: 20 },
    };
    expect(portionNutrition(food, composition, 100).kcal).toBeNull();
  });

  it('gives a confirmed skipped, zero-gram portion no nutrient contribution', () => {
    expect(portionNutrition(food, defaultFoodDetails('ingredient'), 0)).toEqual({
      kcal: 0,
      proteinG: 0,
      fatG: 0,
      carbsG: 0,
    });
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, 10001])(
    'rejects an invalid portion amount (%s)',
    (grams) => expect(() => portionNutrition(food, details, grams)).toThrow(RangeError),
  );
});

describe('food diary input boundaries', () => {
  const entry = {
    requestId: '123e4567-e89b-42d3-a456-426614174000',
    petId,
    date: '2024-02-29',
    source: 'catalog',
    foodId: 'ingredient.chicken',
    grams: 10000,
  };

  it('accepts a real leap day, UUID retry key and bounded weighed portion', () => {
    expect(dietEntryInputSchema.safeParse(entry).success).toBe(true);
  });

  it.each([
    { date: '2026-02-29' },
    { requestId: 'same-food-today' },
    { grams: 0 },
    { grams: 10001 },
    { ownerId: 'different-owner' },
    { nutrition: { kcal: 0 } },
  ])('rejects invalid or client-supplied authority/snapshot fields: %j', (change) => {
    expect(dietEntryInputSchema.safeParse({ ...entry, ...change }).success).toBe(false);
  });

  it('requires explicit screening answers and keeps legacy ten-point BCS out of the assessment', () => {
    expect(dietAssessmentInputSchema.safeParse({ petId, ...assessment }).success).toBe(true);
    expect(
      dietAssessmentInputSchema.safeParse({ petId, ...assessment, stableWeight: undefined })
        .success,
    ).toBe(false);
    expect(
      dietAssessmentInputSchema.safeParse({ petId, ...assessment, conditionScore: 10 }).success,
    ).toBe(false);
  });
});

describe('adult dog starting estimates and comparison references', () => {
  it('uses the research lower-end neutered factor for a 6 kg dog, not arbitrary macro shares', () => {
    const result = estimateDailyDietTargets(pet, today, assessment);
    expect(result.status).toBe('estimated');
    expect(result.factor).toBe(1.4);
    // Independent blueprint oracle: 6 kg at f1.6 is 429.3697661 kcal;
    // f1.4 is 375.6985453375. Display rounding must not change the calculation.
    expect(result.kcal).toBeCloseTo(375.6985453375, 6);
    expect(result.proteinG).toBeCloseTo(19.5738942121, 6);
    expect(result.fatG).toBeCloseTo(5.1658549984, 6);
    expect(result.carbsG).toBeNull();
    expect(result.profile).toBe('fediaf2025.adult95');
    expect(result.reference).toContain('FEDIAF September 2025');
    expect(result.notes.join(' ')).toContain('not a complete recipe');
  });

  it('selects the intact adult factor and A110 profile with the confirmed measured weight', () => {
    const result = estimateDailyDietTargets({ ...pet, neuterStatus: 'no', weightKg: 25 }, today, {
      ...assessment,
      weightKg: 10,
    });
    expect(result.status).toBe('estimated');
    expect(result.factor).toBe(1.6);
    expect(result.weightKg).toBe(10);
    expect(result.kcal).toBeCloseTo(629.8222842, 6);
    expect(result.proteinG).toBeCloseTo(28.342002789, 6);
    expect(result.fatG).toBeCloseTo(8.66005640775, 6);
    expect(result.profile).toBe('fediaf2025.adult110');
  });

  it('does not add a breed/size multiplier or a universal senior reduction', () => {
    const ordinary = estimateDailyDietTargets(pet, today, assessment);
    const senior = estimateDailyDietTargets(
      { ...pet, breed: 'Great Dane', birthMonth: '2016-01' },
      today,
      assessment,
    );
    expect(senior.kcal).toBe(ordinary.kcal);
    expect(senior.proteinG).toBe(ordinary.proteinG);
  });

  it('requests remeasurement for a Shih Tzu weight-entry outlier while leaving diary arithmetic available', () => {
    const result = estimateDailyDietTargets({ ...pet, breed: 'Shih-Tzu' }, today, {
      ...assessment,
      weightKg: 500,
    });
    expect(result.status).toBe('needs-review');
    expect(result.kcal).toBeNull();
    expect(result.proteinG).toBeNull();
    expect(result.fatG).toBeNull();
    expect(result.blockers.join(' ')).toContain('weight and units');
    expect(result.blockers.join(' ')).toContain('weigh the dog again');
    expect(portionNutrition(food, details, 50).kcal).toBe(82.5);
  });

  it('leaves an ordinary 6 kg Shih Tzu estimate unchanged and uses the existing entry threshold', () => {
    const ordinary = estimateDailyDietTargets(pet, today, assessment);
    const breedPet = { ...pet, breed: 'shih tzu' };
    const breedResult = estimateDailyDietTargets(breedPet, today, assessment);
    expect(breedResult.status).toBe('estimated');
    expect(breedResult.kcal).toBe(ordinary.kcal);
    expect(breedResult.proteinG).toBe(ordinary.proteinG);
    expect(estimateDailyDietTargets(breedPet, today, { ...assessment, weightKg: 15 }).status).toBe(
      'estimated',
    );
    expect(
      estimateDailyDietTargets(breedPet, today, { ...assessment, weightKg: 15.1 }).status,
    ).toBe('needs-review');
  });

  it('requires a real assessment rather than treating an existing pet profile as confirmed healthy', () => {
    const result = estimateDailyDietTargets(pet, today, null);
    expect(result.status).toBe('needs-review');
    expect(result.kcal).toBeNull();
    expect(result.proteinG).toBeNull();
    expect(result.fatG).toBeNull();
    expect(result.carbsG).toBeNull();
    expect(result.blockers.join(' ')).toContain('feeding assessment');
  });

  it('uses an explicitly confirmed nine-point BCS independently of the legacy profile score', () => {
    expect(
      estimateDailyDietTargets({ ...pet, bodyConditionScore: 10 }, today, assessment).status,
    ).toBe('estimated');
    const unconfirmed = estimateDailyDietTargets({ ...pet, bodyConditionScore: 5 }, today, {
      ...assessment,
      conditionScore: null,
    });
    expect(unconfirmed.kcal).toBeNull();
    expect(unconfirmed.blockers.join(' ')).toContain('out of 9');
  });

  it('accepts a measured weight exactly 30 days old and blocks older/future measurements', () => {
    expect(
      estimateDailyDietTargets(pet, today, { ...assessment, weightMeasuredOn: '2026-09-01' })
        .status,
    ).toBe('estimated');
    for (const weightMeasuredOn of ['2026-08-31', '2026-10-02']) {
      const result = estimateDailyDietTargets(pet, today, { ...assessment, weightMeasuredOn });
      expect(result.status).toBe('needs-review');
      expect(result.kcal).toBeNull();
    }
  });

  it.each([
    { species: 'cat' },
    { species: 'other' },
    { birthMonth: '2025-01' },
    { pregnantOrNursing: 'yes' },
    { pregnantOrNursing: 'unknown' },
    { neuterStatus: 'prefer_not_to_say' },
    { activityLevel: 'high' },
    { activityLevel: 'unknown' },
    { feedingGoal: 'lose' },
    { healthConditions: ['kidney disease'] },
    { allergies: ['egg'] },
  ] as Partial<Pet>[])(
    'withholds automatic recommendations for an unsupported profile: %j',
    (change) => {
      const result = estimateDailyDietTargets({ ...pet, ...change }, today, assessment);
      expect(result.status).toBe('needs-review');
      expect(result.kcal).toBeNull();
      expect(result.proteinG).toBeNull();
      expect(result.fatG).toBeNull();
      expect(result.blockers.length).toBeGreaterThan(0);
    },
  );

  it.each([
    { growing: true },
    { stableWeight: false },
    { healthConcern: true },
    { prescribedDiet: true },
    { appetiteChange: true },
    { conditionScore: 7 },
    { weightKg: 0 },
    { weightMeasuredOn: '2026-02-30' },
  ] as Partial<DailyDietAssessment>[])(
    'withholds targets for an unreviewed assessment: %j',
    (change) => {
      const result = estimateDailyDietTargets(pet, today, { ...assessment, ...change });
      expect(result.status).toBe('needs-review');
      expect(result.kcal).toBeNull();
      expect(result.blockers.length).toBeGreaterThan(0);
    },
  );
});

describe('logged daily totals and remaining comparisons', () => {
  it('totals known rows and computes remaining energy and minimum comparison gaps', () => {
    const entries: DietNutrition[] = [
      { kcal: 100, proteinG: 8, fatG: 3, carbsG: 10 },
      { kcal: 82.5, proteinG: 15.5, fatG: 1.8, carbsG: 0 },
    ];
    const result = summarizeDailyDiet(entries, targets);
    expect(result.kcal).toEqual({
      known: 182.5,
      total: 182.5,
      missingEntries: 0,
      target: 430,
      remaining: 247.5,
    });
    expect(result.proteinG.total).toBe(23.5);
    expect(result.proteinG.remaining).toBe(0);
    expect(result.fatG.remaining).toBeCloseTo(1.1125, 12);
    expect(result.carbsG).toEqual({
      known: 10,
      total: 10,
      missingEntries: 0,
      target: null,
      remaining: null,
    });
  });

  it('retains per-nutrient known subtotals but never replaces incomplete totals with zero', () => {
    const result = summarizeDailyDiet(
      [
        { nutrition: { kcal: 100, proteinG: 8, fatG: 3, carbsG: 10 } },
        { nutrition: { kcal: null, proteinG: null, fatG: 0, carbsG: null } },
      ],
      targets,
    );
    expect(result.kcal).toEqual({
      known: 100,
      total: null,
      missingEntries: 1,
      target: 430,
      remaining: null,
    });
    expect(result.proteinG.total).toBeNull();
    expect(result.proteinG.known).toBe(8);
    expect(result.proteinG.remaining).toBeNull();
    expect(result.fatG.total).toBe(3);
    expect(result.fatG.missingEntries).toBe(0);
  });

  it('keeps energy over-budget signed but never calls excess protein/fat a negative minimum gap', () => {
    const result = summarizeDailyDiet([{ kcal: 500, proteinG: 30, fatG: 15, carbsG: 43 }], targets);
    expect(result.kcal.remaining).toBe(-70);
    expect(result.proteinG.remaining).toBe(0);
    expect(result.fatG.remaining).toBe(0);
    expect(result.carbsG.remaining).toBeNull();
  });

  it('has zero logged contribution for an empty diary, without claiming an intake was observed', () => {
    const result = summarizeDailyDiet([], targets);
    expect(result.kcal.total).toBe(0);
    expect(result.kcal.remaining).toBe(430);
    expect(result.proteinG.missingEntries).toBe(0);
    // The API entry list, not the total, distinguishes no log from an explicit skipped meal.
    expect(result.carbsG.target).toBeNull();
  });

  it('shows totals without targets for a review-required profile and protects malformed legacy rows', () => {
    const result = summarizeDailyDiet(
      [{ kcal: 20, proteinG: Number.NaN, fatG: -1, carbsG: 0 }],
      estimateDailyDietTargets(pet, today, null),
    );
    expect(result.kcal.total).toBe(20);
    expect(result.kcal.target).toBeNull();
    expect(result.kcal.remaining).toBeNull();
    expect(result.proteinG.total).toBeNull();
    expect(result.fatG.total).toBeNull();
    expect(result.carbsG.total).toBe(0);
  });
});

describe('legacy meal log contributions', () => {
  it('retains calories without inventing undisclosed macros for a fed portion', () => {
    expect(legacyFeedingNutrition(plan, feedingLog)).toEqual({
      kcal: 185,
      proteinG: null,
      fatG: null,
      carbsG: null,
    });
  });

  it('uses the original plan label for each distinct historical log before aggregation', () => {
    const older = legacyFeedingNutrition(plan, { ...feedingLog, actualGrams: 10 });
    const wetPlan = {
      ...plan,
      id: 'abcdefabcdefabcdefabcdef',
      version: 2,
      food: { ...plan.food, calories: 900 },
    };
    const newer = legacyFeedingNutrition(wetPlan, {
      ...feedingLog,
      id: '765432107654321076543210',
      planId: wetPlan.id,
      actualGrams: 10,
    });
    const diary = portionNutrition(food, details, 50);
    const totals = summarizeDailyDiet([older, newer, diary], targets);
    expect(totals.kcal.total).toBe(128.5); // 37 + 9 + 82.5, each unique item once.
    expect(totals.proteinG).toMatchObject({ known: 15.5, total: null, missingEntries: 2 });
  });

  it('records an explicit skipped meal with no extras as zero rather than missing', () => {
    expect(
      legacyFeedingNutrition(plan, {
        ...feedingLog,
        status: 'skipped',
        actualGrams: 0,
        extrasKcal: 0,
      }),
    ).toEqual({ kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 });
  });

  it('keeps extras macros unknown even when the primary meal was skipped', () => {
    expect(
      legacyFeedingNutrition(plan, {
        ...feedingLog,
        status: 'skipped',
        actualGrams: 0,
        extrasKcal: 10,
      }),
    ).toEqual({ kcal: 10, proteinG: null, fatG: null, carbsG: null });
  });

  it('does not replace unknown extras or unknown food energy with a zero calorie intake', () => {
    expect(
      legacyFeedingNutrition(plan, {
        ...feedingLog,
        status: 'skipped',
        actualGrams: 0,
        extrasKcal: null,
      }),
    ).toEqual({ kcal: null, proteinG: null, fatG: null, carbsG: null });
    expect(
      legacyFeedingNutrition({ ...plan, food: { ...plan.food, calories: null } }, feedingLog).kcal,
    ).toBeNull();
  });
});
