import { draftKey } from '@/auth/session';
import {
  mealPlanInputSchema,
  type MealPlan,
  type MealPlanInput,
  type MealPlanPreview,
} from '@vetify/planner-shared/meal-plans';
import type { Pet } from '@vetify/planner-shared/pets';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';

import { previewPlan, saveMealPlan } from '@/services/meal-plans.service';

import { initial } from './plan-draft';
import { FoodFields } from './plan-food-fields';
import { HealthFields } from './plan-health-fields';
import { PlanReview } from './plan-review';
import { PlanSchedule } from './plan-schedule';

const steps = ['Pet and health', 'Food and extras', 'Meal times', 'Review and save'];

export function PlanWizard({
  pet,
  existingPlan,
  onCancel,
  onSaved,
}: {
  pet: Pet;
  existingPlan?: MealPlan;
  onCancel: () => void;
  onSaved: (plan: MealPlan) => void;
}) {
  const [input, setInput] = useState(() => initial(pet, existingPlan));
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState<MealPlanPreview | null>(null);
  const [error, setError] = useState('');
  const previewMutation = useMutation({ mutationFn: previewPlan });
  const saveMutation = useMutation({
    mutationFn: saveMealPlan,
    onSuccess: (plan) => {
      sessionStorage.removeItem(draftKey(pet.id));
      onSaved(plan);
    },
  });

  function update(value: MealPlanInput) {
    setInput(value);
    setPreview(null);
    sessionStorage.setItem(draftKey(pet.id), JSON.stringify(value));
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
        setPreview(await previewMutation.mutateAsync(parsed.data));
        setStep(3);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Preview could not be loaded.');
      }
      return;
    }
    setStep(step + 1);
  }

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-teal-100 bg-white shadow-[0_12px_40px_rgba(23,65,55,0.08)]">
      <div className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-white px-5 py-6 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700">
              Step {step + 1} of 4
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-teal-950">
              Plan meals for {pet.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-white"
          >
            Close
          </button>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-2" aria-label="Plan progress">
          {steps.map((name, index) => (
            <div
              key={name}
              className={`h-1.5 rounded-full ${index <= step ? 'bg-teal-700' : 'bg-slate-200'}`}
            />
          ))}
        </div>
      </div>
      <div className="px-5 py-6 sm:px-8">
        <h3 className="mb-5 text-lg font-bold text-slate-900">{steps[step]}</h3>
        {step === 0 && <HealthFields pet={pet} value={input} set={update} />}
        {step === 1 && <FoodFields pet={pet} value={input} set={update} />}
        {step === 2 && <PlanSchedule value={input} set={update} />}
        {step === 3 && preview && <PlanReview pet={pet} input={input} preview={preview} />}
        {(error || saveMutation.error) && (
          <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-900">
            {error || saveMutation.error?.message}
          </p>
        )}
        <div className="mt-7 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
          {step > 0 && (
            <button
              type="button"
              onClick={() => {
                setStep(step - 1);
                setError('');
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              onClick={() => void next()}
              disabled={previewMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {previewMutation.isPending ? 'Checking...' : 'Next'} <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={saveMutation.isPending || !preview || preview.blockers.length > 0}
              onClick={() => saveMutation.mutate(input)}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"
            >
              <Check size={16} /> {saveMutation.isPending ? 'Saving...' : 'Save plan'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
