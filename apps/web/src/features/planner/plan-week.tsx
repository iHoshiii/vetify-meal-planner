import type { MealPlan } from '@vetify/planner-shared/meal-plans';

function nextDays(today: string): string[] {
  const [year, month, day] = today.split('-').map(Number);
  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(year, month - 1, day + index);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
      value.getDate(),
    ).padStart(2, '0')}`;
  });
}

export function PlanWeek({ plan, today }: { plan: MealPlan; today: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {nextDays(today).map((date) => (
        <div key={date} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <h3 className="font-bold text-slate-900">
            {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </h3>
          <p className="mt-1 text-xs text-slate-500">{plan.preview.dailyGrams} g planned</p>
          <div className="mt-3 space-y-1 text-sm text-slate-700">
            {plan.mealTimes.map((time, index) => (
              <p key={index}>
                {time} · {plan.preview.mealGrams[index]} g
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
