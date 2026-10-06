import { previewMealPlan } from '@vetify/planner-shared/meal-calculation';
import type { MealPlanInput } from '@vetify/planner-shared/meal-plans';
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
});
