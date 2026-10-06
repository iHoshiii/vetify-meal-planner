import { accountToday } from '@/auth/session';
import type { Dispatch, SetStateAction } from 'react';
import type { Pet, PetInput } from '@vetify/planner-shared/pets';
import { estimatedBirthMonthFromAge, petAge } from '@vetify/planner-shared/pet-age';

export type FormValues = Omit<
  PetInput,
  | 'species'
  | 'otherSpecies'
  | 'weightKg'
  | 'allergies'
  | 'healthConditions'
  | 'ageYears'
  | 'ageMonths'
  | 'birthMonth'
> & {
  species: string;
  birthMonth: string;
  birthMonthEstimated: boolean;
  ageValue: string;
  ageUnit: 'years' | 'months';
  ageRemainderMonths: number;
  weightKg: string;
  allergies: string;
  healthConditions: string;
};

const emptyForm: FormValues = {
  name: '',
  species: '',
  breed: '',
  birthMonth: '',
  birthMonthEstimated: false,
  ageValue: '',
  ageUnit: 'years',
  ageRemainderMonths: 0,
  sex: 'unknown',
  neuterStatus: 'prefer_not_to_say',
  weightKg: '',
  allergies: '',
  healthConditions: '',
  foodPreferences: '',
  currentFood: '',
  activityLevel: 'unknown',
  bodyConditionScore: null,
  feedingGoal: 'unsure',
  pregnantOrNursing: 'unknown',
};

export function startingValues(pet?: Pet): FormValues {
  if (!pet) return { ...emptyForm };
  const age = petAge(pet, accountToday());
  const ageUnit = age.years === 0 ? 'months' : 'years';
  const birthMonthEstimated = !pet.birthMonth;
  return {
    ...pet,
    species: pet.species === 'other' ? pet.otherSpecies : pet.species === 'dog' ? 'Dog' : 'Cat',
    birthMonth: pet.birthMonth ?? estimatedBirthMonthFromAge(age.years, age.months, accountToday()),
    birthMonthEstimated,
    ageValue: String(ageUnit === 'months' ? age.years * 12 + age.months : age.years),
    ageUnit,
    ageRemainderMonths: ageUnit === 'years' ? age.months : 0,
    weightKg: String(pet.weightKg),
    allergies: pet.allergies.join(', '),
    healthConditions: pet.healthConditions.join(', '),
  };
}

export type StepProps = {
  form: FormValues;
  set: <K extends keyof FormValues>(key: K, value: FormValues[K]) => void;
  setForm: Dispatch<SetStateAction<FormValues>>;
  shihTzu: boolean;
  weightAboveTypicalShihTzu: boolean;
};
