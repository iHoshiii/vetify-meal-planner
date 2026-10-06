import { dailyIntake } from '@vetify/planner-shared/meal-intake';
import type { FeedingLog, MealPlan } from '@vetify/planner-shared/meal-plans';

export function DailyBudget({
  plan,
  logs,
  earlier = [],
}: {
  plan: MealPlan;
  logs: FeedingLog[];
  earlier?: Array<{ plan: MealPlan; logs: FeedingLog[] }>;
}) {
  const intake = dailyIntake(plan, logs, earlier);
  const exact = intake.remainingKcal !== null;
  const left = exact ? intake.remainingKcal! : intake.gramsRemaining;
  const target = exact ? intake.targetKcal! : plan.preview.dailyGrams;
  const consumed = exact ? intake.consumedKcal! : intake.gramsEaten;
  const unit = exact ? 'kcal' : 'g';
  const progress = target ? Math.min(100, Math.max(0, (consumed / target) * 100)) : 0;
  return (
    <div className="rounded-2xl border border-teal-100 bg-white p-5 shadow-xs" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Today</p>
          <p className="mt-1 text-3xl font-extrabold text-teal-950">
            {left === null
              ? 'No target'
              : `${Math.round(Math.abs(left))} ${unit} ${left < 0 ? 'over' : 'left'}`}
          </p>
        </div>
        <p className="text-sm font-semibold text-slate-600">
          {Math.round(consumed)} / {target === null ? '?' : Math.round(target)} {unit}
        </p>
      </div>
      <div
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Daily intake progress"
      >
        <div
          className={`h-full rounded-full ${
            left !== null && left < 0 ? 'bg-amber-500' : 'bg-teal-600'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {!exact && (
        <p className="mt-2 text-xs text-slate-500">
          Calorie balance needs a food label and known extras.
        </p>
      )}
    </div>
  );
}
