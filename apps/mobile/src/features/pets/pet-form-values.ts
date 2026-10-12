import type { Pet, PetInput } from '@vetify/planner-shared/pets';
import { estimatedBirthMonthFromAge, petAge } from '@vetify/planner-shared/pet-age';

export type PetFormValues = Omit<
  PetInput,
  'weightKg' | 'allergies' | 'healthConditions' | 'ageYears' | 'ageMonths' | 'birthMonth'
> & {
  weightKg: string;
  allergies: string;
  healthConditions: string;
  birthMonth: string;
  birthMonthEstimated: boolean;
  ageValue: string;
  ageUnit: 'years' | 'months';
  ageRemainderMonths: number;
};

export type PetFieldSetter = <K extends keyof PetFormValues>(
  key: K,
  value: PetFormValues[K],
) => void;
export type PetStepProps = { form: PetFormValues; set: PetFieldSetter };

export const petSteps = [
  'Basics',
  'Age and care',
  'Food and weight',
  'Health and activity',
  'Review',
];
export const fieldStep: Record<string, number> = {
  name: 0,
  species: 0,
  otherSpecies: 0,
  breed: 0,
  sex: 0,
  ageYears: 1,
  ageMonths: 1,
  birthMonth: 1,
  neuterStatus: 1,
  pregnantOrNursing: 1,
  weightKg: 2,
  currentFood: 2,
  feedingGoal: 2,
  allergies: 2,
  healthConditions: 3,
  bodyConditionScore: 3,
  activityLevel: 3,
  foodPreferences: 3,
};

export function startingValues(pet: Pet | undefined, today: string): PetFormValues {
  if (!pet)
    return {
      name: '',
      species: 'dog',
      otherSpecies: '',
      breed: '',
      sex: 'unknown',
      neuterStatus: 'prefer_not_to_say',
      pregnantOrNursing: 'unknown',
      weightKg: '',
      allergies: '',
      healthConditions: '',
      currentFood: '',
      foodPreferences: '',
      activityLevel: 'unknown',
      feedingGoal: 'unsure',
      bodyConditionScore: null,
      birthMonth: '',
      birthMonthEstimated: false,
      ageValue: '',
      ageUnit: 'years',
      ageRemainderMonths: 0,
    };
  const age = petAge(pet, today);
  const ageUnit = age.years === 0 ? 'months' : 'years';
  return {
    ...pet,
    birthMonth: pet.birthMonth ?? estimatedBirthMonthFromAge(age.years, age.months, today),
    birthMonthEstimated: !pet.birthMonth,
    ageValue: String(ageUnit === 'months' ? age.months : age.years),
    ageUnit,
    ageRemainderMonths: ageUnit === 'years' ? age.months : 0,
    weightKg: String(pet.weightKg),
    allergies: pet.allergies.join(', '),
    healthConditions: pet.healthConditions.join(', '),
  };
}

export function formInput(form: PetFormValues): unknown {
  const age = form.ageValue.trim() === '' ? Number.NaN : Number(form.ageValue);
  const split = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  return {
    ...form,
    otherSpecies: form.species === 'other' ? form.otherSpecies : '',
    birthMonth: form.birthMonthEstimated ? null : form.birthMonth || null,
    ageYears: form.ageUnit === 'months' ? Math.floor(age / 12) : age,
    ageMonths: form.ageUnit === 'months' ? age % 12 : form.ageRemainderMonths,
    weightKg: form.weightKg.trim() === '' ? Number.NaN : Number(form.weightKg),
    allergies: split(form.allergies),
    healthConditions: split(form.healthConditions),
  };
}
