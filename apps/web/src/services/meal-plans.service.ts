import type {
  FeedingLog,
  FeedingLogInput,
  MealPlan,
  MealPlanInput,
  MealPlanPreview,
} from '@vetify/planner-shared/meal-plans';

import { apiFetch } from './api';

export async function getMealPlans(petId: string): Promise<MealPlan[]> {
  const response = await apiFetch<{ plans: MealPlan[] }>(
    `/meal-plans?petId=${encodeURIComponent(petId)}`,
  );
  return response.plans;
}

export async function previewPlan(input: MealPlanInput): Promise<MealPlanPreview> {
  const response = await apiFetch<{ preview: MealPlanPreview }>('/meal-plans/preview', {
    method: 'POST',
    body: input,
  });
  return response.preview;
}

export async function saveMealPlan(input: MealPlanInput): Promise<MealPlan> {
  const response = await apiFetch<{ plan: MealPlan }>('/meal-plans', {
    method: 'POST',
    body: input,
  });
  return response.plan;
}

export async function getFeedingLogs(planId: string, date: string): Promise<FeedingLog[]> {
  const response = await apiFetch<{ logs: FeedingLog[] }>(
    `/meal-plans/${planId}/logs?date=${encodeURIComponent(date)}`,
  );
  return response.logs;
}

export async function saveFeedingLog(planId: string, input: FeedingLogInput): Promise<FeedingLog> {
  const response = await apiFetch<{ log: FeedingLog }>(`/meal-plans/${planId}/logs`, {
    method: 'PUT',
    body: input,
  });
  return response.log;
}
