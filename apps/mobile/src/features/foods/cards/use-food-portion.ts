import { useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { portionNutrition } from '@vetify/planner-shared/daily-diet';
import { useAddDietEntry } from '../../../services/diet-queries';
import type { FoodCardProps } from './food-card';

export function useFoodPortion({ pet, food, details, entrySource, today }: FoodCardProps) {
  const [open, setOpen] = useState<'view' | 'add' | null>(null);
  const [grams, setGrams] = useState('');
  const [added, setAdded] = useState(false);
  const requestId = useRef<string | null>(null);
  const add = useAddDietEntry();
  const validAmount =
    grams.trim() !== '' &&
    Number.isFinite(Number(grams)) &&
    Number(grams) > 0 &&
    Number(grams) <= 10000;
  const nutrition = portionNutrition(
    food,
    details,
    open === 'add' && validAmount ? Number(grams) : 100,
  );
  function toggle(next: 'view' | 'add') {
    add.reset();
    setAdded(false);
    setOpen(open === next ? null : next);
  }
  function amount(value: string) {
    setGrams(value);
    requestId.current = null;
    add.reset();
  }
  function addPortion() {
    if (!entrySource || !validAmount || add.isPending) return;
    requestId.current ??= randomUUID();
    add.mutate(
      {
        ...entrySource,
        requestId: requestId.current,
        petId: pet.id,
        date: today,
        grams: Number(grams),
      },
      {
        onSuccess: () => {
          requestId.current = null;
          setGrams('');
          setOpen(null);
          setAdded(true);
        },
      },
    );
  }
  return { open, setOpen, grams, amount, added, add, validAmount, nutrition, toggle, addPortion };
}
export type FoodPortion = ReturnType<typeof useFoodPortion>;
