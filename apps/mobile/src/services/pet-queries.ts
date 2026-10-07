import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PetInput } from '@vetify/planner-shared/pets';
import { ownerQueryKey } from '../auth/session';
import { getPets, savePet } from './pets.service';

export function usePets() {
  return useQuery({ queryKey: ownerQueryKey('pets'), queryFn: getPets });
}
export function useCreatePet() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: PetInput) => savePet(input),
    onSuccess: () => client.invalidateQueries({ queryKey: ownerQueryKey('pets') }),
  });
}
export function useUpdatePet() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PetInput }) => savePet(input, id),
    onSuccess: () => client.invalidateQueries({ queryKey: ownerQueryKey('pets') }),
  });
}
