import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SavedFoodInput } from '@vetify/planner-shared/foods';
import { ownerQueryKey } from '../auth/session';
import { getFoods, saveFood } from './foods.service';

export function useFoods(petId: string) {
  return useQuery({ queryKey: ownerQueryKey('foods', petId), queryFn: () => getFoods(petId) });
}

export function useSaveFood() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ input, id }: { input: SavedFoodInput; id?: string }) => saveFood(input, id),
    onSuccess: (_, { input }) =>
      client.invalidateQueries({ queryKey: ownerQueryKey('foods', input.petId) }),
  });
}
