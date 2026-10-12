import type { FoodLibrary, SavedFood, SavedFoodInput } from '@vetify/planner-shared/foods';
import { apiFetch } from './api';

export function getFoods(petId: string): Promise<FoodLibrary> {
  return apiFetch<FoodLibrary>(`/foods?petId=${encodeURIComponent(petId)}`);
}

export async function saveFood(input: SavedFoodInput, id?: string): Promise<SavedFood> {
  const response = await apiFetch<{ food: SavedFood }>(
    id ? `/foods/${encodeURIComponent(id)}` : '/foods',
    {
      method: id ? 'PUT' : 'POST',
      body: input,
    },
  );
  return response.food;
}

export async function deleteFood(id: string): Promise<void> {
  await apiFetch<void>(`/foods/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
