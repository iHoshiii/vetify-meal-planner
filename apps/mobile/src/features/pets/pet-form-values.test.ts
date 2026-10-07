import { describe, expect, it } from 'vitest';
import { petInputSchema, type Pet, type PetInput } from '@vetify/planner-shared/pets';
import { formInput, startingValues } from './pet-form-values';

const input: PetInput = {
  name: 'Milo',
  species: 'dog',
  otherSpecies: '',
  breed: 'Shih Tzu',
  birthMonth: null,
  ageYears: 2,
  ageMonths: 3,
  sex: 'male',
  neuterStatus: 'yes',
  weightKg: 6.2,
  allergies: ['Beef', 'Chicken'],
  healthConditions: ['Arthritis'],
  foodPreferences: 'Wet food',
  currentFood: 'Adult recipe',
  activityLevel: 'moderate',
  bodyConditionScore: 5,
  feedingGoal: 'maintain',
  pregnantOrNursing: 'no',
};
const pet: Pet = {
  ...input,
  id: 'pet-1',
  ageYearsAtReference: 2,
  ageMonthsAtReference: 3,
  ageReferenceOn: '2026-10-07',
  registeredOn: '2024-10-07',
  createdAt: '2024-10-07T00:00:00.000Z',
  updatedAt: '2026-10-07T00:00:00.000Z',
};

describe('native pet profile editing', () => {
  it('preserves estimated age provenance and every profile field when editing', () => {
    const values = startingValues(pet, '2026-10-07');
    expect(values.birthMonth).toBe('2024-07');
    expect(values.birthMonthEstimated).toBe(true);
    expect(petInputSchema.parse(formInput(values))).toEqual(input);
  });

  it('keeps a supplied birth month authoritative instead of saving its age as an estimate', () => {
    const values = startingValues({ ...pet, birthMonth: '2024-06' }, '2026-10-07');
    expect(values.birthMonthEstimated).toBe(false);
    expect(petInputSchema.parse(formInput(values))).toMatchObject({
      birthMonth: '2024-06',
      ageYears: 2,
      ageMonths: 3,
    });
  });

  it('converts a complete age in months without losing its remainder', () => {
    const values = {
      ...startingValues(pet, '2026-10-07'),
      ageUnit: 'months' as const,
      ageValue: '27',
    };
    expect(petInputSchema.parse(formInput(values))).toMatchObject({ ageYears: 2, ageMonths: 3 });
  });

  it('keeps other-species details and splits allergy entries without saving empty items', () => {
    const values = {
      ...startingValues(pet, '2026-10-07'),
      species: 'other' as const,
      otherSpecies: 'Rabbit',
      allergies: '  Hay, , Dust  ',
    };
    expect(petInputSchema.parse(formInput(values))).toMatchObject({
      species: 'other',
      otherSpecies: 'Rabbit',
      allergies: ['Hay', 'Dust'],
    });
  });

  it('rejects empty ages and weights instead of turning them into zero', () => {
    const values = startingValues(undefined, '2026-10-07');
    values.name = 'Milo';
    const parsed = petInputSchema.safeParse(formInput(values));
    expect(parsed.success).toBe(false);
    if (!parsed.success)
      expect(parsed.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(['ageYears', 'weightKg']),
      );
  });
});
