import { useState, type FormEvent } from 'react';
import {
  isShihTzu,
  petInputSchema,
  SHIH_TZU_TYPICAL_ADULT_MAX_KG,
  SHIH_TZU_WEIGHT_ENTRY_MAX_KG,
  SHIH_TZU_WEIGHT_ERROR,
  type Pet,
  type PetInput,
} from '@vetify/planner-shared/pets';
import { startingValues, type FormValues } from './pet-form-values';
import { toList } from './pet-form-helpers';
export const steps = [
  'Pet information',
  'Age and care',
  'Food and feeding',
  'Health and activity',
  'Confirm or edit',
] as const;
export const reviewStep = steps.length - 1;

const fieldStep: Record<string, number> = {
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

export function usePetForm(pet: Pet | undefined, onSave: (input: PetInput) => void) {
  const [form, setForm] = useState<FormValues>(() => startingValues(pet));
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [returnToReview, setReturnToReview] = useState(false);
  const shihTzu = isShihTzu(form.species, form.breed);
  const weightAboveTypicalShihTzu =
    shihTzu && Number(form.weightKg) > SHIH_TZU_TYPICAL_ADULT_MAX_KG;
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  function next(formElement: HTMLFormElement | null) {
    if (step === 0 && !form.name.trim()) {
      setError('Enter your pet’s name.');
      return;
    }
    if (step === 0 && (!form.species.trim() || form.species.trim().toLowerCase() === 'other')) {
      setError('Enter the species name, such as dog, cat, or rabbit.');
      return;
    }
    if (step === 1 && form.ageValue === '') {
      setError('Enter an age or choose a birth month.');
      return;
    }
    if (step === 2 && (!Number.isFinite(Number(form.weightKg)) || Number(form.weightKg) <= 0)) {
      setError('Enter a current weight greater than zero.');
      return;
    }
    if (step === 2 && shihTzu && Number(form.weightKg) > SHIH_TZU_WEIGHT_ENTRY_MAX_KG) {
      setError(SHIH_TZU_WEIGHT_ERROR);
      return;
    }
    if (!formElement?.reportValidity()) return;
    setError('');
    setStep(returnToReview ? reviewStep : Math.min(step + 1, reviewStep));
    setReturnToReview(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== reviewStep) {
      next(event.currentTarget);
      return;
    }
    const species = form.species.trim();
    const normalizedSpecies = species.toLowerCase();
    if (normalizedSpecies === 'other') {
      setError('Enter the species name, such as rabbit or bird.');
      return;
    }
    const age = Number(form.ageValue);
    const ageMonths = form.ageUnit === 'months' ? age % 12 : form.ageRemainderMonths;
    const ageYears = form.ageUnit === 'months' ? Math.floor(age / 12) : age;
    const parsed = petInputSchema.safeParse({
      ...form,
      species:
        normalizedSpecies === 'dog' || normalizedSpecies === 'cat' ? normalizedSpecies : 'other',
      otherSpecies: normalizedSpecies === 'dog' || normalizedSpecies === 'cat' ? '' : species,
      birthMonth: form.birthMonthEstimated ? null : form.birthMonth || null,
      ageYears: form.ageValue === '' ? Number.NaN : ageYears,
      ageMonths: form.ageValue === '' ? Number.NaN : ageMonths,
      weightKg: Number(form.weightKg),
      allergies: toList(form.allergies),
      healthConditions: toList(form.healthConditions),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue?.message ?? 'Check the pet details.');
      setStep(fieldStep[String(issue?.path[0])] ?? step);
      setReturnToReview(true);
      return;
    }
    setError('');
    onSave(parsed.data);
  }

  return {
    form,
    setForm,
    set,
    error,
    setError,
    step,
    setStep,
    returnToReview,
    setReturnToReview,
    shihTzu,
    weightAboveTypicalShihTzu,
    next,
    submit,
  };
}
