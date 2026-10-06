import type { Pet, PetInput } from '@vetify/planner-shared/pets';

import { apiFetch } from './api';

export async function getPets(): Promise<Pet[]> {
  const response = await apiFetch<{ pets: Pet[] }>('/pets');
  return response.pets;
}

export async function savePet(input: PetInput, id?: string): Promise<Pet> {
  const response = await apiFetch<{ pet: Pet }>(id ? `/pets/${id}` : '/pets', {
    method: id ? 'PUT' : 'POST',
    body: input,
  });
  return response.pet;
}
