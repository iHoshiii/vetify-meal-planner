import type {
  NutritionObservation,
  NutritionObservationInput,
} from '@vetify/planner-shared/nutrition-observations';

import { apiFetch } from './api';

export async function getNutritionObservations(petId: string): Promise<NutritionObservation[]> {
  const response = await apiFetch<{ observations: NutritionObservation[] }>(
    `/nutrition-observations?petId=${encodeURIComponent(petId)}`,
  );
  return response.observations;
}

export async function saveNutritionObservation(
  input: NutritionObservationInput,
): Promise<NutritionObservation> {
  const response = await apiFetch<{ observation: NutritionObservation }>(
    '/nutrition-observations',
    {
      method: 'POST',
      body: input,
    },
  );
  return response.observation;
}
