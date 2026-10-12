import { useState } from 'react';
import { petInputSchema, type Pet, type PetInput } from '@vetify/planner-shared/pets';
import { ageFromBirthMonth, estimatedBirthMonthFromAge } from '@vetify/planner-shared/pet-age';
import {
  fieldStep,
  formInput,
  petSteps,
  startingValues,
  type PetFormValues,
} from './pet-form-values';

export function usePetForm(pet: Pet | undefined, today: string, onSave: (input: PetInput) => void) {
  const [form, setForm] = useState(() => startingValues(pet, today));
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [returnToReview, setReturnToReview] = useState(false);
  const reviewStep = petSteps.length - 1;
  function set<K extends keyof PetFormValues>(key: K, value: PetFormValues[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setError('');
  }
  function setAge(ageValue: string) {
    setForm((previous) => {
      const value = Number(ageValue);
      const valid = ageValue !== '' && Number.isInteger(value) && value >= 0 && value <= 2411;
      const years = previous.ageUnit === 'years' ? value : Math.floor(value / 12);
      const months = previous.ageUnit === 'months' ? value % 12 : 0;
      return {
        ...previous,
        ageValue,
        ageRemainderMonths: 0,
        birthMonth: valid ? estimatedBirthMonthFromAge(years, months, today) : '',
        birthMonthEstimated: valid,
      };
    });
    setError('');
  }
  function setAgeUnit(ageUnit: PetFormValues['ageUnit']) {
    setForm((previous) => {
      const age = Number(previous.ageValue);
      if (previous.ageValue === '' || !Number.isInteger(age) || age < 0)
        return { ...previous, ageUnit };
      const total = previous.ageUnit === 'years' ? age * 12 + previous.ageRemainderMonths : age;
      return {
        ...previous,
        ageUnit,
        ageValue: String(ageUnit === 'years' ? Math.floor(total / 12) : total),
        ageRemainderMonths: ageUnit === 'years' ? total % 12 : 0,
      };
    });
  }
  function setBirthMonth(birthMonth: string) {
    setForm((previous) => {
      const valid = /^\d{4}-(0[1-9]|1[0-2])$/.test(birthMonth) && birthMonth <= today.slice(0, 7);
      const age = valid ? ageFromBirthMonth(birthMonth, today) : null;
      return {
        ...previous,
        birthMonth,
        birthMonthEstimated: false,
        ageValue: age
          ? String(previous.ageUnit === 'years' ? age.years : age.years * 12 + age.months)
          : previous.ageValue,
        ageRemainderMonths:
          age && previous.ageUnit === 'years' ? age.months : previous.ageRemainderMonths,
      };
    });
    setError('');
  }
  function submit() {
    if (
      (step === 0 || step === reviewStep) &&
      form.species === 'other' &&
      (!form.otherSpecies.trim() || form.otherSpecies.trim().toLowerCase() === 'other')
    ) {
      setError('Enter the species name, such as rabbit or bird.');
      setStep(0);
      return;
    }
    if (
      (step === 1 || step === reviewStep) &&
      !form.birthMonthEstimated &&
      form.birthMonth &&
      (form.birthMonth < '1800-01' || form.birthMonth > today.slice(0, 7))
    ) {
      setError('Enter a birth month between January 1800 and this month.');
      setStep(1);
      return;
    }
    const parsed = petInputSchema.safeParse(formInput(form));
    const issue = parsed.success
      ? undefined
      : parsed.error.issues.find(
          (item) => step === reviewStep || fieldStep[String(item.path[0])] === step,
        );
    if (issue) {
      setError(issue.message);
      if (step === reviewStep) {
        setStep(fieldStep[String(issue.path[0])] ?? 0);
        setReturnToReview(true);
      }
      return;
    }
    setError('');
    if (step === reviewStep && parsed.success) onSave(parsed.data);
    else {
      setStep(returnToReview ? reviewStep : Math.min(step + 1, reviewStep));
      setReturnToReview(false);
    }
  }
  function edit(nextStep: number) {
    setStep(nextStep);
    setReturnToReview(true);
    setError('');
  }
  return { form, set, step, setStep, error, setAge, setAgeUnit, setBirthMonth, submit, edit };
}
