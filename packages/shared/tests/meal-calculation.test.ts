import { previewMealPlan } from '@vetify/planner-shared/meal-calculation';
import { mealPlanInputSchema, type MealPlanInput } from '@vetify/planner-shared/meal-plans';
import { estimateDailyDietTargets } from '@vetify/planner-shared/daily-diet';
import type { Pet } from '@vetify/planner-shared/pets';
import { describe, expect, it } from 'vitest';

const pet: Pet = {
  id: '507f1f77bcf86cd799439011',
  name: 'Milo',
  species: 'dog',
  otherSpecies: '',
  breed: 'Shih Tzu',
  birthMonth: '2022-01',
  ageYearsAtReference: 4,
  ageMonthsAtReference: 0,
  registeredOn: '2026-01-01',
  ageReferenceOn: '2026-01-01',
  sex: 'male',
  neuterStatus: 'yes',
  weightKg: 10,
  allergies: [],
  healthConditions: [],
  foodPreferences: '',
  currentFood: '',
  activityLevel: 'moderate',
  bodyConditionScore: null,
  feedingGoal: 'maintain',
  pregnantOrNursing: 'no',
  createdAt: '',
  updatedAt: '',
};

const input: MealPlanInput = {
  requestId: '12345678-1234-1234-1234-123456789abc',
  petId: pet.id,
  mode: 'estimate',
  weightKg: 10,
  weightMeasuredOn: '2026-09-25',
  conditionScore: 5,
  stableWeight: true,
  growing: false,
  healthConcern: false,
  prescribedDiet: false,
  appetiteChange: false,
  food: {
    name: 'Adult food',
    form: 'dry',
    adequacy: 'complete',
    species: 'dog',
    lifeStage: 'adult',
    calorieBasis: 'kg',
    calories: 3500,
    packageGrams: null,
    labelSource: 'Bag label',
    labelCheckedOn: '2026-09-25',
  },
  extrasKcal: 30,
  manualDailyGrams: null,
  mealTimes: ['08:00', '18:00'],
};
const today = '2026-10-01';
const cat: Pet = { ...pet, name: 'Nori', species: 'cat', breed: 'Mixed', weightKg: 4 };
const catInput: MealPlanInput = {
  ...input,
  weightKg: 4,
  muscleCondition: 'normal',
  extrasKcal: 0,
  food: { ...input.food, species: 'cat', calories: 900 },
};

describe('meal plan calculation', () => {
  it('uses label calories and keeps the split equal to the daily amount', () => {
    const result = previewMealPlan(pet, input, '2026-10-01');
    expect(result.blockers).toEqual([]);
    expect(result.factor).toBe(1.4);
    expect(result.dailyKcal).toBe(551);
    expect(result.dailyGrams).toBe(148.9);
    expect(result.mealGrams.reduce((sum, grams) => sum + grams, 0)).toBe(result.dailyGrams);
  });

  it('gets the same amount from equivalent can calories and grams', () => {
    const perCan = previewMealPlan(
      pet,
      {
        ...input,
        food: {
          ...input.food,
          form: 'wet',
          calorieBasis: 'package',
          calories: 350,
          packageGrams: 100,
        },
      },
      '2026-10-01',
    );
    expect(perCan.dailyGrams).toBe(148.9);
  });

  it('blocks an estimate for a pet with a condition or stale weight', () => {
    const result = previewMealPlan(
      { ...pet, healthConditions: ['diabetes'] },
      { ...input, weightMeasuredOn: '2026-01-01' },
      '2026-10-01',
    );
    expect(result.dailyGrams).toBeNull();
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        'Health conditions or food reactions need a reviewed food plan.',
        'Measure the pet again before estimating a portion.',
      ]),
    );
  });

  it('schedules an existing amount without running the estimate', () => {
    const result = previewMealPlan(
      { ...pet, healthConditions: ['diabetes'] },
      {
        ...input,
        mode: 'manual',
        manualDailyGrams: 100,
        conditionScore: null,
        food: { ...input.food, adequacy: 'unknown', calories: null },
      },
      '2026-10-01',
    );
    expect(result.blockers).toEqual([]);
    expect(result.dailyKcal).toBeNull();
    expect(result.mealGrams).toEqual([50, 50]);
  });

  it('withholds an estimate when extras would exceed the complete-food allowance', () => {
    const result = previewMealPlan(pet, { ...input, extrasKcal: 100 }, '2026-10-01');
    expect(result.dailyGrams).toBeNull();
    expect(result.blockers).toContain(
      'Treats exceed 10% of estimated daily calories. Review the food plan.',
    );
  });

  it('keeps canine calorie/gram rounding and screening unaffected by optional muscle evidence', () => {
    const expected = previewMealPlan(pet, input, today);
    for (const muscleCondition of ['normal', 'unknown', 'mild-loss', 'severe-loss'] as const)
      expect(previewMealPlan(pet, { ...input, muscleCondition }, today)).toEqual(expected);
    expect(expected.dailyKcal).toBe(551);
    expect(expected.dailyGrams).toBe(148.9);
  });
});

describe('new feline commercial portion estimates', () => {
  it('matches the full-precision daily reference while rounding the weighed food portions', () => {
    const result = previewMealPlan(cat, catInput, today);
    const reference = estimateDailyDietTargets(cat, today, {
      weightKg: catInput.weightKg,
      weightMeasuredOn: catInput.weightMeasuredOn,
      conditionScore: catInput.conditionScore,
      stableWeight: catInput.stableWeight,
      growing: catInput.growing,
      healthConcern: catInput.healthConcern,
      prescribedDiet: catInput.prescribedDiet,
      appetiteChange: catInput.appetiteChange,
      muscleCondition: catInput.muscleCondition,
    });
    expect(result.blockers).toEqual([]);
    expect(reference.blockers).toEqual([]);
    expect(result.factor).toBe(1.2);
    expect(result.dailyKcal).toBeCloseTo(237.58787847868, 10);
    expect(result.dailyKcal).toBe(reference.kcal);
    expect(result.foodKcal).toBe(result.dailyKcal);
    expect(result.dailyGrams).toBe(264);
    expect(result.mealGrams).toEqual([132, 132]);
  });

  it('gives the same feline portion from equivalent packaged and kilogram label calories', () => {
    const result = previewMealPlan(
      cat,
      {
        ...catInput,
        food: {
          ...catInput.food,
          calorieBasis: 'package',
          packageGrams: 90,
          calories: 81,
        },
      },
      today,
    );
    expect(result).toEqual(previewMealPlan(cat, catInput, today));
  });

  it('uses the ordinary intact factor without stacking age, breed, or activity multipliers', () => {
    const result = previewMealPlan(
      { ...cat, neuterStatus: 'no', breed: 'Maine Coon' },
      { ...catInput, weightKg: 6 },
      today,
    );
    expect(result.blockers).toEqual([]);
    expect(result.factor).toBe(1.4);
    expect(result.dailyKcal).toBeCloseTo(375.698545296808, 10);
    expect(result.dailyGrams).toBe(417.4);
    expect(result.mealGrams.reduce((sum, grams) => sum + grams, 0)).toBe(result.dailyGrams);
  });

  it.each([undefined, 'unknown', 'mild-loss', 'moderate-loss', 'severe-loss'] as const)(
    'requires normal feline muscle condition for newly calculated portions: %s',
    (muscleCondition) => {
      const result = previewMealPlan(cat, { ...catInput, muscleCondition }, today);
      expect(result.dailyGrams).toBeNull();
      expect(result.mealGrams).toEqual([]);
      expect(result.blockers.join(' ')).toContain('muscle condition');
    },
  );

  it('keeps the assessment field optional in historical plan inputs without a healthy default', () => {
    const { muscleCondition: _muscleCondition, ...legacy } = catInput;
    const parsed = mealPlanInputSchema.parse(legacy);
    expect(parsed.muscleCondition).toBeUndefined();
    expect(previewMealPlan(cat, parsed, today).dailyGrams).toBeNull();
  });

  it('requires review from the seventh birthday but does not change an entered older-cat schedule', () => {
    const mature = { ...cat, birthMonth: '2018-01' };
    const estimate = previewMealPlan(mature, catInput, today);
    expect(estimate.dailyGrams).toBeNull();
    expect(estimate.blockers.join(' ')).toContain('in this release');
    const manual = previewMealPlan(
      { ...mature, healthConditions: ['kidney disease'] },
      {
        ...catInput,
        mode: 'manual',
        manualDailyGrams: 100,
        muscleCondition: undefined,
        conditionScore: null,
      },
      today,
    );
    expect(manual.blockers).toEqual([]);
    expect(manual.factor).toBeNull();
    expect(manual.dailyGrams).toBe(100);
    expect(manual.dailyKcal).toBe(90);
    expect(manual.mealGrams).toEqual([50, 50]);
  });

  it('withholds a new cat portion below the selected nutrient-density comparison domain', () => {
    const result = previewMealPlan(cat, { ...catInput, weightKg: 0.2 }, today);
    expect(result.dailyGrams).toBeNull();
    expect(result.mealGrams).toEqual([]);
    expect(result.blockers).toContain(
      'This energy intake needs a reviewed feline nutrient-density profile.',
    );
  });

  it.each([
    { adequacy: 'supplemental' },
    { species: 'dog' },
    { lifeStage: 'growth' },
    { calories: null },
    { labelSource: '' },
  ] as Partial<MealPlanInput['food']>[])(
    'does not prescribe a primary portion from an unsuitable or unverified cat food: %j',
    (change) => {
      const result = previewMealPlan(
        cat,
        { ...catInput, food: { ...catInput.food, ...change } },
        today,
      );
      expect(result.dailyGrams).toBeNull();
      expect(result.blockers.length).toBeGreaterThan(0);
    },
  );
});
