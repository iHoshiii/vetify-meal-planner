import { accountToday } from '@/auth/session';
import type { MealPlanInput } from '@vetify/planner-shared/meal-plans';
import type { Pet } from '@vetify/planner-shared/pets';

const field =
  'mt-1.5 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-hidden focus:border-teal-700 focus:ring-2 focus:ring-teal-100';
const label = 'block min-w-0 text-sm font-semibold text-slate-800';

type Props = { pet: Pet; value: MealPlanInput; set: (value: MealPlanInput) => void };

export function HealthFields({ pet, value, set }: Props) {
  const update = (patch: Partial<MealPlanInput>) => set({ ...value, ...patch });
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Measured weight, kg
          <input
            className={field}
            type="number"
            min="0.1"
            max="500"
            step="0.1"
            value={value.weightKg}
            onChange={(event) => update({ weightKg: Number(event.target.value) })}
            required
          />
        </label>
        <label className={label}>
          Date {pet.name} was weighed
          <input
            className={field}
            type="date"
            max={accountToday()}
            value={value.weightMeasuredOn}
            onChange={(event) => update({ weightMeasuredOn: event.target.value })}
            required
          />
        </label>
        <label className={label}>
          Body condition, 1 to 9 <span className="font-normal text-slate-500">(optional)</span>
          <select
            className={field}
            value={value.conditionScore ?? ''}
            onChange={(event) =>
              update({ conditionScore: event.target.value ? Number(event.target.value) : null })
            }
          >
            <option value="">Not sure</option>
            {Array.from({ length: 9 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1} of 9
              </option>
            ))}
          </select>
          <a
            href="https://wsava.org/wp-content/uploads/2025/06/WSAVA_BCSCat_BCSDog_Nutrition_250612.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-xs font-medium text-teal-700 underline"
          >
            See the dog and cat body condition guide
          </a>
        </label>
      </div>
      <div className="rounded-xl bg-teal-50 p-4">
        <p className="text-sm font-bold text-teal-950">How should this plan be made?</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            aria-pressed={value.mode === 'manual'}
            onClick={() => update({ mode: 'manual' })}
            className={`rounded-xl border p-3 text-left text-sm ${
              value.mode === 'manual'
                ? 'border-teal-700 bg-white font-bold'
                : 'border-slate-200 bg-white/60'
            }`}
          >
            Schedule an existing amount
          </button>
          <button
            type="button"
            aria-pressed={value.mode === 'estimate'}
            onClick={() => update({ mode: 'estimate' })}
            className={`rounded-xl border p-3 text-left text-sm ${
              value.mode === 'estimate'
                ? 'border-teal-700 bg-white font-bold'
                : 'border-slate-200 bg-white/60'
            }`}
          >
            Estimate a starting amount
          </button>
        </div>
      </div>
      {value.mode === 'estimate' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ['stableWeight', 'Weight has been stable'],
              ['growing', 'Still growing'],
              ['healthConcern', 'Health concern or food reaction'],
              ['prescribedDiet', 'On a prescribed diet'],
              ['appetiteChange', 'Recent appetite change'],
            ] as const
          ).map(([key, text]) => (
            <label
              key={key}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800"
            >
              <input
                type="checkbox"
                checked={value[key]}
                onChange={(event) => update({ [key]: event.target.checked })}
              />
              {text}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
