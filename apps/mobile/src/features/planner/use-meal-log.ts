import { useMutation, useQueryClient } from '@tanstack/react-query';
import { foodKcalPerGram, GRAMS_PER_OUNCE, mealKcal } from '@vetify/planner-shared/meal-intake';
import {
  feedingLogInputSchema,
  type FeedingLog,
  type FeedingLogInput,
  type MealPlan,
} from '@vetify/planner-shared/meal-plans';
import { useEffect, useRef, useState } from 'react';

import { ownerQueryKey } from '../../auth/session';

import { saveFeedingLog } from '../../services/meal-plans.service';

const mass = (value: number) => String(Math.round(value * 1000) / 1000);

export function useMealLog(plan: MealPlan, date: string, index: number, log?: FeedingLog) {
  const planned = plan.preview.mealGrams[index] ?? 0;
  const [editing, setEditing] = useState(false);
  const [unit, setUnit] = useState<'g' | 'oz'>('g');
  const unitRef = useRef(unit);
  const [amount, setAmount] = useState(mass(log?.actualGrams ?? planned));
  const [extras, setExtras] = useState(log ? String(log.extrasKcal ?? '') : '0');
  const [note, setNote] = useState(log?.note ?? '');
  const queryClient = useQueryClient();
  const storedExtras = log?.extrasKcal;
  useEffect(() => {
    setAmount(
      mass((log?.actualGrams ?? planned) / (unitRef.current === 'oz' ? GRAMS_PER_OUNCE : 1)),
    );
    setExtras(storedExtras === undefined ? '0' : String(storedExtras ?? ''));
    setNote(log?.note ?? '');
  }, [log?.actualGrams, storedExtras, log?.note, planned, date]);
  const grams = Number(amount) * (unit === 'oz' ? GRAMS_PER_OUNCE : 1);
  const density = foodKcalPerGram(plan.food);
  const extrasValid =
    extras.trim() === '' ||
    (Number.isFinite(Number(extras)) && Number(extras) >= 0 && Number(extras) <= 5000);
  const amountValid = amount.trim() !== '' && Number.isFinite(grams) && grams > 0 && grams <= 5000;
  const preview =
    amountValid && density !== null && extras.trim() !== '' && extrasValid
      ? grams * density + Number(extras)
      : null;
  const savedKcal = log ? mealKcal(plan, log) : null;
  const mutation = useMutation({
    mutationFn: (status: FeedingLogInput['status']) =>
      saveFeedingLog(
        plan.id,
        feedingLogInputSchema.parse({
          date,
          mealIndex: index,
          status,
          actualGrams: status === 'skipped' ? 0 : grams,
          extrasKcal: extras.trim() === '' ? null : Number(extras),
          note,
        }),
      ),
    onSuccess: (saved) => {
      setAmount(mass((saved.actualGrams ?? 0) / (unitRef.current === 'oz' ? GRAMS_PER_OUNCE : 1)));
      setEditing(false);
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: ownerQueryKey('feeding-logs', plan.id, date),
        }),
        queryClient.invalidateQueries({ queryKey: ownerQueryKey('monthly-progress', plan.petId) }),
      ]);
    },
  });
  function changeUnit(next: 'g' | 'oz') {
    if (amount.trim() && Number.isFinite(grams))
      setAmount(mass(grams / (next === 'oz' ? GRAMS_PER_OUNCE : 1)));
    unitRef.current = next;
    setUnit(next);
  }
  return {
    planned,
    editing,
    setEditing,
    unit,
    amount,
    setAmount,
    extras,
    setExtras,
    note,
    setNote,
    grams,
    extrasValid,
    amountValid,
    preview,
    savedKcal,
    mutation,
    changeUnit,
  };
}
