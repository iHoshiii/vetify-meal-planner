import { dailyIntake, mealKcal } from './meal-intake.js';

import type { MealPlan } from './meal-plans.js';

import { todayInTimeZone } from './planner-date.js';

import type { MonthlyProgressDay, MonthlyFeedingEntry } from './monthly-progress-types.js';
import type { MonthlyProgressInput } from './monthly-progress.js';
function activeOn(plan: MealPlan, date: string): boolean {
  // Logs store civil dates validated in the saved plan's zone; changing the account zone must not move history.
  return (
    todayInTimeZone(plan.timeZone, new Date(plan.activeFrom)) <= date &&
    (!plan.endedAt || todayInTimeZone(plan.timeZone, new Date(plan.endedAt)) >= date)
  );
}

export function progressDays(input: MonthlyProgressInput, dates: string[], plans: MealPlan[]) {
  const byId = new Map(plans.map((plan) => [plan.id, plan]));
  const orderedPlans = [...plans].sort((a, b) => b.version - a.version);
  const savedFoodEntries = [
    ...new Map(
      (input.foodEntries ?? [])
        .filter((entry) => entry.petId === input.petId)
        .map((entry) => [entry.id, entry]),
    ).values(),
  ];
  return dates.map((date): MonthlyProgressDay => {
    const target = orderedPlans.find((plan) => activeOn(plan, date));
    const snapshot =
      date > input.today
        ? undefined
        : (input.targetSnapshots ?? [])
            .filter((item) => item.petId === input.petId && item.date === date)
            .sort(
              (a, b) =>
                b.recordedAt.localeCompare(a.recordedAt) ||
                b.revisionId.localeCompare(a.revisionId),
            )[0];
    const referenceValid =
      snapshot?.targets.status === 'estimated' &&
      !snapshot.expired &&
      (date !== input.today || snapshot.timeZone === input.timeZone);
    const logs =
      date > input.today
        ? []
        : input.logs.filter((log) => log.date === date && byId.has(log.planId));
    const entries = logs.map((log): MonthlyFeedingEntry => {
      const plan = byId.get(log.planId);
      return {
        planId: log.planId,
        planVersion: plan?.version ?? null,
        foodName: plan?.food.name ?? null,
        mealIndex: log.mealIndex,
        status: log.status,
        grams: log.actualGrams,
        kcal: plan && log.actualGrams !== null ? mealKcal(plan, log) : null,
        extrasKcal: log.extrasKcal,
        note: log.note,
      };
    });
    // Saved portions already contain their original composition; never recalculate them from a current custom label or copy them into the plan log list.
    const foodEntries =
      date > input.today ? [] : savedFoodEntries.filter((entry) => entry.date === date);
    const recorded = entries.length > 0 || foodEntries.length > 0;
    const amounts = [
      ...entries,
      ...foodEntries.map((entry) => ({ grams: entry.grams, kcal: entry.nutrition.kcal })),
    ];
    return {
      date,
      status: date > input.today ? 'future' : recorded ? 'recorded' : 'unlogged',
      mealsLogged: entries.length,
      foodsLogged: foodEntries.length,
      skippedMeals: entries.filter((entry) => entry.status === 'skipped').length,
      grams:
        !recorded || amounts.some((entry) => entry.grams === null)
          ? null
          : amounts.reduce((sum, entry) => sum + entry.grams!, 0),
      kcal:
        !recorded || amounts.some((entry) => entry.kcal === null)
          ? null
          : amounts.reduce((sum, entry) => sum + entry.kcal!, 0),
      targetGrams: snapshot ? null : (target?.preview.dailyGrams ?? null),
      targetKcal: snapshot
        ? referenceValid
          ? snapshot.targets.kcal
          : null
        : target
          ? dailyIntake(target, []).targetKcal
          : null,
      targetPlanId: snapshot ? null : (target?.id ?? null),
      targetPlanVersion: snapshot ? null : (target?.version ?? null),
      targetDietReference: snapshot
        ? {
            revisionId: snapshot.revisionId,
            version: snapshot.targets.version,
            profile: snapshot.targets.profile,
            reference: snapshot.targets.reference,
            timeZone: snapshot.timeZone,
          }
        : null,
      recordedPlanVersions: [
        ...new Set(
          entries.flatMap((entry) => (entry.planVersion === null ? [] : [entry.planVersion])),
        ),
      ].sort((a, b) => a - b),
      entries,
      foodEntries,
    };
  });
}
