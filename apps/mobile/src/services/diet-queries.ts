import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DietAssessmentInput, DietEntryInput } from '@vetify/planner-shared/daily-diet';
import { ownerQueryKey } from '../auth/session';
import {
  addDietEntry,
  getDietAssessment,
  getDietEntries,
  removeDietEntry,
  saveDietAssessment,
} from './diet.service';

export function useDietEntries(petId: string, date: string) {
  return useQuery({
    queryKey: ownerQueryKey('diet-day', petId, date),
    queryFn: () => getDietEntries(petId, date),
  });
}

export function useDietAssessment(
  petId: string,
  today?: string,
  petUpdatedAt?: string,
  timeZone?: string,
) {
  return useQuery({
    queryKey: ownerQueryKey('diet-assessment', petId, today, petUpdatedAt, timeZone),
    queryFn: () => getDietAssessment(petId),
  });
}

export function useAddDietEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: addDietEntry,
    onSuccess: (_, input: DietEntryInput) =>
      Promise.all([
        client.invalidateQueries({ queryKey: ownerQueryKey('diet-day', input.petId, input.date) }),
        client.invalidateQueries({ queryKey: ownerQueryKey('monthly-progress', input.petId) }),
      ]),
  });
}

export function useRemoveDietEntry(petId: string, date: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: removeDietEntry,
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ownerQueryKey('diet-day', petId, date) }),
        client.invalidateQueries({ queryKey: ownerQueryKey('monthly-progress', petId) }),
      ]),
  });
}

export function useSaveDietAssessment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: saveDietAssessment,
    onSuccess: (_, input: DietAssessmentInput) =>
      Promise.all([
        client.invalidateQueries({ queryKey: ownerQueryKey('diet-assessment', input.petId) }),
        client.invalidateQueries({ queryKey: ownerQueryKey('monthly-progress', input.petId) }),
      ]),
  });
}
