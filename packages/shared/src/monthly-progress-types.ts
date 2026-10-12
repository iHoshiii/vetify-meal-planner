import type { DietEntry } from './daily-diet.js';
import type { DietTargetSnapshot } from './diet-target-snapshots.js';
import type { FeedingLog } from './meal-plans.js';
import type { NutritionObservation } from './nutrition-observations.js';

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
  targetDietReference?: {
    revisionId: string;
    version: string;
    profile: DietTargetSnapshot['targets']['profile'];
    reference: string;
    timeZone: string;
  } | null;
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
