import type {
  DailyDietAssessment,
  DietAssessmentInput,
  DietEntry,
  DietEntryInput,
} from '@vetify/planner-shared/daily-diet';
import { apiFetch } from './api';

export async function getDietEntries(petId: string, date: string): Promise<DietEntry[]> {
  const result = await apiFetch<{ entries: DietEntry[] }>(
    `/diet-entries?petId=${encodeURIComponent(petId)}&date=${encodeURIComponent(date)}`,
  );
  return result.entries;
}

export async function addDietEntry(input: DietEntryInput): Promise<DietEntry> {
  const result = await apiFetch<{ entry: DietEntry }>('/diet-entries', {
    method: 'POST',
    body: input,
  });
  return result.entry;
}

export async function removeDietEntry(id: string): Promise<void> {
  await apiFetch<void>(`/diet-entries/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getDietAssessment(petId: string): Promise<DailyDietAssessment | null> {
  const result = await apiFetch<{ assessment: DailyDietAssessment | null }>(
    `/diet-assessments/${encodeURIComponent(petId)}`,
  );
  return result.assessment;
}

export async function saveDietAssessment(input: DietAssessmentInput): Promise<DailyDietAssessment> {
  const result = await apiFetch<{ assessment: DailyDietAssessment }>(
    `/diet-assessments/${encodeURIComponent(input.petId)}`,
    { method: 'PUT', body: input },
  );
  return result.assessment;
}
