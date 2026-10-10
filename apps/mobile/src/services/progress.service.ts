import type { MonthlyProgress } from '@vetify/planner-shared/monthly-progress';
import { apiFetch } from './api';

export async function getMonthlyProgress(petId: string, month: string): Promise<MonthlyProgress> {
  const response = await apiFetch<{ progress: MonthlyProgress }>(
    `/progress?petId=${encodeURIComponent(petId)}&month=${encodeURIComponent(month)}`,
  );
  return response.progress;
}
