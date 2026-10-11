import { dailyIntake, mealKcal } from './meal-intake.js';
import type { DietEntry } from './daily-diet.js';
import type { FeedingLog, MealPlan } from './meal-plans.js';
import type { NutritionObservation } from './nutrition-observations.js';
import { todayInTimeZone, validCalendarDay } from './planner-date.js';

export type MonthlyFeedingEntry = {
  planId: string;
  planVersion: number | null;
  foodName: string | null;
  mealIndex: number;
  status: FeedingLog['status'];
  grams: number | null;
  kcal: number | null;
  extrasKcal: number | null;
  note: string;
};

export type MonthlyProgressDay = {
  date: string;
  status: 'future' | 'unlogged' | 'recorded';
  mealsLogged: number;
  foodsLogged: number;
  skippedMeals: number;
  grams: number | null;
  kcal: number | null;
  targetGrams: number | null;
  targetKcal: number | null;
  targetPlanId: string | null;
  targetPlanVersion: number | null;
  recordedPlanVersions: number[];
  entries: MonthlyFeedingEntry[];
  foodEntries: DietEntry[];
};

export type MonthlyProgress = {
  petId: string;
  month: string;
  today: string;
  timeZone: string;
  days: MonthlyProgressDay[];
  summary: {
    recordedDays: number;
    loggedMeals: number;
    loggedFoods: number;
    knownCalorieDays: number;
    unknownCalorieDays: number;
    knownLoggedKcal: number | null;
    loggedGrams: number | null;
  };
  measurements: NutritionObservation[];
};

export function validProgressMonth(month: string): boolean {
  return /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month) && validCalendarDay(`${month}-01`);
}

export function progressMonthDates(month: string): string[] {
  if (!validProgressMonth(month)) throw new Error('Choose a valid month');
  const day = new Date(`${month}-01T12:00:00.000Z`);
  const dates: string[] = [];
  while (day.toISOString().slice(0, 7) === month) {
    dates.push(day.toISOString().slice(0, 10));
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return dates;
}

function activeOn(plan: MealPlan, date: string): boolean {
  // Logs store civil dates validated in the saved plan's zone; changing the account zone must not move history.
  return (
    todayInTimeZone(plan.timeZone, new Date(plan.activeFrom)) <= date &&
    (!plan.endedAt || todayInTimeZone(plan.timeZone, new Date(plan.endedAt)) >= date)
  );
}

export function summarizeMonthlyProgress(input: {
  petId: string;
  month: string;
  today: string;
  timeZone: string;
  plans: MealPlan[];
  logs: FeedingLog[];
  foodEntries?: DietEntry[];
  measurements?: NutritionObservation[];
}): MonthlyProgress {
  const dates = progressMonthDates(input.month);
  const plans = input.plans.filter((plan) => plan.petId === input.petId);
  const byId = new Map(plans.map((plan) => [plan.id, plan]));
  const orderedPlans = [...plans].sort((a, b) => b.version - a.version);
  const savedFoodEntries = [
    ...new Map(
      (input.foodEntries ?? [])
        .filter((entry) => entry.petId === input.petId)
        .map((entry) => [entry.id, entry]),
    ).values(),
  ];
  const days = dates.map((date): MonthlyProgressDay => {
    const target = orderedPlans.find((plan) => activeOn(plan, date));
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
    // Saved portions already contain their original composition; never recalculate
    // them from a current custom label or copy them into the plan log list.
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
      targetGrams: target?.preview.dailyGrams ?? null,
      targetKcal: target ? dailyIntake(target, []).targetKcal : null,
      targetPlanId: target?.id ?? null,
      targetPlanVersion: target?.version ?? null,
      recordedPlanVersions: [
        ...new Set(
          entries.flatMap((entry) => (entry.planVersion === null ? [] : [entry.planVersion])),
        ),
      ].sort((a, b) => a - b),
      entries,
      foodEntries,
    };
  });
  const recorded = days.filter((day) => day.status === 'recorded');
  const known = recorded.filter((day) => day.kcal !== null);
  return {
    petId: input.petId,
    month: input.month,
    today: input.today,
    timeZone: input.timeZone,
    days,
    summary: {
      recordedDays: recorded.length,
      loggedMeals: recorded.reduce((sum, day) => sum + day.mealsLogged, 0),
      loggedFoods: recorded.reduce((sum, day) => sum + day.foodsLogged, 0),
      knownCalorieDays: known.length,
      unknownCalorieDays: recorded.length - known.length,
      knownLoggedKcal: known.length ? known.reduce((sum, day) => sum + day.kcal!, 0) : null,
      loggedGrams:
        !recorded.length || recorded.some((day) => day.grams === null)
          ? null
          : recorded.reduce((sum, day) => sum + day.grams!, 0),
    },
    measurements: (input.measurements ?? [])
      .filter(
        (item) =>
          item.petId === input.petId &&
          item.measuredOn.slice(0, 7) === input.month &&
          item.measuredOn <= input.today,
      )
      .sort(
        (a, b) =>
          b.measuredOn.localeCompare(a.measuredOn) || b.createdAt.localeCompare(a.createdAt),
      ),
  };
}
