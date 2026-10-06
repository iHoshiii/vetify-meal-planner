import type { MealPlanInput } from '@vetify/planner-shared/meal-plans';

const field =
  'mt-1.5 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-hidden focus:border-teal-700 focus:ring-2 focus:ring-teal-100';

function suggestedTimes(count: number): string[] {
  if (count === 1) return ['08:00'];
  return Array.from({ length: count }, (_, index) => {
    const hour = Math.round(7 + (index * 12) / (count - 1));
    return `${String(hour).padStart(2, '0')}:00`;
  });
}

export function PlanSchedule({
  value,
  set,
}: {
  value: MealPlanInput;
  set: (value: MealPlanInput) => void;
}) {
  return (
    <div className="space-y-5">
      {value.mode === 'manual' && (
        <label className="block text-sm font-semibold text-slate-800">
          Existing daily food amount, grams
          <input
            className={field}
            type="number"
            min="0.1"
            max="5000"
            step="0.1"
            placeholder="e.g. 160"
            value={value.manualDailyGrams ?? ''}
            onChange={(event) =>
              set({
                ...value,
                manualDailyGrams: event.target.value ? Number(event.target.value) : null,
              })
            }
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Use the amount you already feed or were given by your veterinarian.
          </span>
        </label>
      )}
      <label className="block max-w-xs text-sm font-semibold text-slate-800">
        Meals each day
        <select
          className={field}
          value={value.mealTimes.length}
          onChange={(event) =>
            set({ ...value, mealTimes: suggestedTimes(Number(event.target.value)) })
          }
        >
          {Array.from({ length: 6 }, (_, index) => (
            <option key={index + 1} value={index + 1}>
              {index + 1}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        {value.mealTimes.map((time, index) => (
          <label key={index} className="block text-sm font-semibold text-slate-800">
            Meal {index + 1} time
            <input
              className={field}
              type="time"
              value={time}
              onChange={(event) => {
                const mealTimes = [...value.mealTimes];
                mealTimes[index] = event.target.value;
                set({ ...value, mealTimes });
              }}
            />
          </label>
        ))}
      </div>
      <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        The daily amount is divided evenly. Times are reminders for your schedule, not a change to
        the daily amount.
      </p>
    </div>
  );
}
