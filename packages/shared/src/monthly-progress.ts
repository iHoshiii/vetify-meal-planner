import type { DietEntry } from './daily-diet.js';
import type { DietTargetSnapshot } from './diet-target-snapshots.js';
import type { FeedingLog, MealPlan } from './meal-plans.js';
import type { NutritionObservation } from './nutrition-observations.js';
import { validCalendarDay } from './planner-date.js';

import type { MonthlyProgress } from './monthly-progress-types.js';
export type {
  MonthlyFeedingEntry,
  MonthlyProgressDay,
  MonthlyProgress,
} from './monthly-progress-types.js';
import { progressDays } from './monthly-progress-days.js';
export type MonthlyProgressInput = {
  petId: string;
  month: string;
  today: string;
  timeZone: string;
  plans: MealPlan[];
  logs: FeedingLog[];
  foodEntries?: DietEntry[];
  targetSnapshots?: DietTargetSnapshot[];
  measurements?: NutritionObservation[];
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

export function summarizeMonthlyProgress(input: MonthlyProgressInput): MonthlyProgress {
  const dates = progressMonthDates(input.month);
  const plans = input.plans.filter((plan) => plan.petId === input.petId);
  const days = progressDays(input, dates, plans);
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
