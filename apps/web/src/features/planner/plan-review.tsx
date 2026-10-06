import type { MealPlanInput, MealPlanPreview } from '@vetify/planner-shared/meal-plans';
import type { Pet } from '@vetify/planner-shared/pets';

export function PlanReview({
  pet,
  input,
  preview,
}: {
  pet: Pet;
  input: MealPlanInput;
  preview: MealPlanPreview;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-teal-50 p-4">
          <p className="text-xs font-bold uppercase text-teal-800">Pet</p>
          <p className="mt-1 font-bold text-teal-950">{pet.name}</p>
        </div>
        <div className="rounded-xl bg-teal-50 p-4">
          <p className="text-xs font-bold uppercase text-teal-800">Daily food</p>
          <p className="mt-1 font-bold text-teal-950">
            {preview.dailyGrams === null ? 'Unavailable' : `${preview.dailyGrams} g`}
          </p>
        </div>
        <div className="rounded-xl bg-teal-50 p-4">
          <p className="text-xs font-bold uppercase text-teal-800">Plan type</p>
          <p className="mt-1 font-bold text-teal-950">
            {input.mode === 'manual' ? 'Existing amount' : 'Starting estimate'}
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 p-4">
        <h3 className="font-bold text-slate-900">{input.food.name}</h3>
        <p className="mt-1 text-sm text-slate-600">
          {input.food.adequacy === 'complete'
            ? 'Complete food, as entered from label'
            : 'Food adequacy not confirmed'}
          {input.food.calories
            ? ` · ${input.food.calories} kcal/${
                input.food.calorieBasis === 'kg' ? 'kg' : 'package'
              }`
            : ''}
        </p>
        {preview.dailyKcal !== null && (
          <p className="mt-1 text-sm text-slate-600">
            {input.mode === 'manual' ? 'Entered daily amount' : 'Starting estimate'}:{' '}
            {Math.round(preview.dailyKcal)} kcal/day
            {input.mode === 'estimate'
              ? `, including ${input.extrasKcal} kcal of extras. Factor ${preview.factor}.`
              : '.'}
          </p>
        )}
        <p className="mt-1 text-sm text-slate-600">
          Weight: {input.weightKg} kg, measured {input.weightMeasuredOn}.
        </p>
      </div>
      <div className="space-y-2">
        {input.mealTimes.map((time, index) => (
          <div
            key={index}
            className="flex justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm"
          >
            <span>
              Meal {index + 1} · {time}
            </span>
            <strong>{preview.mealGrams[index] ?? '—'} g</strong>
          </div>
        ))}
      </div>
      {preview.warnings.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
          {preview.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}
      {preview.blockers.length > 0 && (
        <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-bold">This plan cannot be saved yet.</p>
          <ul className="mt-2 list-disc pl-5">
            {preview.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
