import { ownerQueryKey } from '@/auth/session';
import type { MealPlan } from '@vetify/planner-shared/meal-plans';
import type { NutritionObservationInput } from '@vetify/planner-shared/nutrition-observations';
import { todayInTimeZone } from '@vetify/planner-shared/planner-date';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  getNutritionObservations,
  saveNutritionObservation,
} from '@/services/nutrition-observations.service';

export function PlanProgress({ plan, onReview }: { plan: MealPlan; onReview: () => void }) {
  const queryClient = useQueryClient();
  const observations = useQuery({
    queryKey: ownerQueryKey('nutrition-observations', plan.petId),
    queryFn: () => getNutritionObservations(plan.petId),
  });
  const [input, setInput] = useState<NutritionObservationInput>({
    petId: plan.petId,
    weightKg: plan.petWeightKg,
    measuredOn: todayInTimeZone(plan.timeZone),
    conditionScore: plan.conditionScore,
    observer: 'owner',
  });
  const mutation = useMutation({
    mutationFn: saveNutritionObservation,
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ownerQueryKey('nutrition-observations', plan.petId),
      }),
  });
  const latest = observations.data?.find((item) => item.measuredOn >= plan.weightMeasuredOn);
  const weightChange = latest ? Math.abs(latest.weightKg - plan.petWeightKg) / plan.petWeightKg : 0;
  const conditionChanged =
    latest?.conditionScore !== null &&
    latest?.conditionScore !== undefined &&
    latest.conditionScore !== plan.conditionScore;
  const lastWeightOn = latest?.measuredOn ?? plan.weightMeasuredOn;
  const staleWeight =
    Date.parse(`${todayInTimeZone(plan.timeZone)}T00:00:00Z`) -
      Date.parse(`${lastWeightOn}T00:00:00Z`) >
    30 * 86400000;
  const reviewNeeded =
    weightChange >= 0.05 ||
    conditionChanged ||
    staleWeight ||
    (latest?.conditionScore !== null &&
      latest?.conditionScore !== undefined &&
      (latest.conditionScore < 4 || latest.conditionScore > 5));
  const field =
    'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-hidden focus:border-teal-700 focus:ring-2 focus:ring-teal-100';
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">Weight and condition</h3>
          <p className="mt-1 text-sm text-slate-500">
            Plan started at {plan.petWeightKg} kg on {plan.weightMeasuredOn}.
          </p>
        </div>
        {reviewNeeded && (
          <button
            type="button"
            onClick={onReview}
            className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-950"
          >
            Review this plan
          </button>
        )}
      </div>
      <form
        className="mt-5 grid gap-3 sm:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(input);
        }}
      >
        <label className="text-xs font-bold text-slate-700">
          Weight, kg
          <input
            className={field}
            type="number"
            min="0.1"
            max="500"
            step="0.1"
            required
            value={input.weightKg}
            onChange={(event) => setInput({ ...input, weightKg: Number(event.target.value) })}
          />
        </label>
        <label className="text-xs font-bold text-slate-700">
          Measured on
          <input
            className={field}
            type="date"
            max={todayInTimeZone(plan.timeZone)}
            required
            value={input.measuredOn}
            onChange={(event) => setInput({ ...input, measuredOn: event.target.value })}
          />
        </label>
        <label className="text-xs font-bold text-slate-700">
          Condition, 1 to 9
          <select
            className={field}
            value={input.conditionScore ?? ''}
            onChange={(event) =>
              setInput({
                ...input,
                conditionScore: event.target.value ? Number(event.target.value) : null,
              })
            }
          >
            <option value="">Not sure</option>
            {Array.from({ length: 9 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1} of 9
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="self-end rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving...' : 'Record weight'}
        </button>
      </form>
      {mutation.error && (
        <p role="alert" className="mt-3 text-sm text-rose-700">
          {mutation.error.message}
        </p>
      )}
      {observations.isError && (
        <p role="alert" className="mt-3 text-sm text-rose-700">
          Measurements could not be loaded.
        </p>
      )}
      {observations.data && observations.data.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-xs font-bold uppercase text-slate-500">Recent measurements</p>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {observations.data.slice(0, 5).map((item) => (
              <li key={item.id} className="flex flex-wrap justify-between gap-2">
                <span>{item.measuredOn}</span>
                <span className="font-bold">
                  {item.weightKg} kg{item.conditionScore ? ` · ${item.conditionScore}/9` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
