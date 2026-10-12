import {
  mealPlanInputSchema,
  type MealPlan,
  type MealPlanInput,
  type MealPlanPreview,
} from '@vetify/planner-shared/meal-plans';
import type { Pet } from '@vetify/planner-shared/pets';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { draftKey } from '../../auth/session';
import { previewPlan, saveMealPlan } from '../../services/meal-plans.service';
import { initial, loadDraft, removeDraft, storeDraft } from './plan-draft';

export function usePlanWizard(
  pet: Pet,
  existingPlan: MealPlan | undefined,
  onSaved: (plan: MealPlan) => void,
) {
  const [input, setInput] = useState(() => initial(pet, existingPlan));
  const [key] = useState(() => draftKey(pet.id));
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState<MealPlanPreview | null>(null);
  const [error, setError] = useState('');
  const [draftError, setDraftError] = useState('');
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const previewMutation = useMutation({ mutationFn: previewPlan });
  const saveMutation = useMutation({
    mutationFn: saveMealPlan,
    onSuccess: async (plan) => {
      await removeDraft(key).catch(() =>
        Alert.alert('Plan saved', 'The draft could not be cleared on this device.'),
      );
      if (mounted.current) onSaved(plan);
    },
  });
  const busy = previewMutation.isPending || saveMutation.isPending;

  useEffect(() => {
    let active = true;
    mounted.current = true;
    void loadDraft(key, pet.id)
      .then((draft) => {
        if (active && draft) setInput(draft);
      })
      .catch(() => {
        if (active)
          setDraftError('The saved draft could not be loaded. You can still make a plan.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [key, pet.id]);

  function update(value: MealPlanInput) {
    if (busy || loading) return;
    setInput(value);
    setPreview(null);
    setError('');
    saveMutation.reset();
    void storeDraft(key, value)
      .then(() => {
        if (mounted.current) setDraftError('');
      })
      .catch(() => {
        if (mounted.current)
          setDraftError(
            'The draft could not be saved on this device. Keep this screen open until you save.',
          );
      });
  }

  async function next() {
    setError('');
    if (step === 0 && (!input.weightMeasuredOn || !input.weightKg || input.weightKg <= 0)) {
      return setError('Enter the measured weight and date.');
    }
    if (step === 1 && input.food.name.trim().length < 2)
      return setError('Enter the exact food name.');
    if (step === 2) {
      if (input.mode === 'manual' && !input.manualDailyGrams)
        return setError('Enter the existing daily amount.');
      const parsed = mealPlanInputSchema.safeParse(input);
      if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Check the details.');
      try {
        const checked = await previewMutation.mutateAsync(parsed.data);
        if (mounted.current) {
          setInput(parsed.data);
          setPreview(checked);
          setStep(3);
        }
      } catch (cause) {
        if (mounted.current)
          setError(cause instanceof Error ? cause.message : 'Preview could not be loaded.');
      }
      return;
    }
    setStep(step + 1);
  }

  function back() {
    setStep(step - 1);
    setError('');
    saveMutation.reset();
  }

  return {
    input,
    step,
    preview,
    error: error || saveMutation.error?.message,
    draftError,
    loading,
    busy,
    checking: previewMutation.isPending,
    saving: saveMutation.isPending,
    update,
    next,
    back,
    save: () => saveMutation.mutate(input),
  };
}
