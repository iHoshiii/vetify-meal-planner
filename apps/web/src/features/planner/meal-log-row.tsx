import { ownerQueryKey } from '@/auth/session';
import { foodKcalPerGram, GRAMS_PER_OUNCE, mealKcal } from '@vetify/planner-shared/meal-intake';
import type { FeedingLog, FeedingLogInput, MealPlan } from '@vetify/planner-shared/meal-plans';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { saveFeedingLog } from '@/services/meal-plans.service';
import { MealEntryFields } from './meal-entry-fields';

const mass = (value: number) => String(Math.round(value * 1000) / 1000);

export function MealLogRow({
  plan,
  date,
  index,
  log,
}: {
  plan: MealPlan;
  date: string;
  index: number;
  log?: FeedingLog;
}) {
  const planned = plan.preview.mealGrams[index] ?? 0;
  const [unit, setUnit] = useState<'g' | 'oz'>('g');
  const unitRef = useRef(unit);
  const [amount, setAmount] = useState(mass(log?.actualGrams ?? planned));
  const [extras, setExtras] = useState(log ? String(log.extrasKcal ?? '') : '0');
  const [note, setNote] = useState(log?.note ?? '');
  const storedExtras = log?.extrasKcal;
  const queryClient = useQueryClient();
  useEffect(() => {
    setAmount(
      mass((log?.actualGrams ?? planned) / (unitRef.current === 'oz' ? GRAMS_PER_OUNCE : 1)),
    );
    setExtras(storedExtras === undefined ? '0' : String(storedExtras ?? ''));
    setNote(log?.note ?? '');
  }, [log?.actualGrams, storedExtras, log?.note, planned]);
  const grams = Number(amount) * (unit === 'oz' ? GRAMS_PER_OUNCE : 1);
  const density = foodKcalPerGram(plan.food);
  const preview =
    amount && Number.isFinite(grams) && grams >= 0 && density !== null && extras !== ''
      ? grams * density + Number(extras)
      : null;
  const savedKcal = log ? mealKcal(plan, log) : null;
  const mutation = useMutation({
    mutationFn: (status: FeedingLogInput['status']) =>
      saveFeedingLog(plan.id, {
        date,
        mealIndex: index,
        status,
        actualGrams: status === 'skipped' ? 0 : grams,
        extrasKcal: extras === '' ? null : Number(extras),
        note,
      }),
    onSuccess: (saved) => {
      setAmount(mass((saved.actualGrams ?? 0) / (unit === 'oz' ? GRAMS_PER_OUNCE : 1)));
      void queryClient.invalidateQueries({
        queryKey: ownerQueryKey('feeding-logs', plan.id, date),
      });
    },
  });
  const changeUnit = (next: 'g' | 'oz') => {
    if (amount !== '' && Number.isFinite(grams))
      setAmount(mass(grams / (next === 'oz' ? GRAMS_PER_OUNCE : 1)));
    unitRef.current = next;
    setUnit(next);
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
            Meal {index + 1} · {plan.mealTimes[index]}
          </p>
          <p className="mt-1 text-lg font-extrabold text-slate-900">
            {plan.food.name} · {planned} g planned
          </p>
        </div>
        {log && (
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
            {log.status === 'skipped'
              ? 'Skipped'
              : `${mass(log.actualGrams ?? 0)} g · ${
                  savedKcal === null ? '? kcal' : `${Math.round(savedKcal)} kcal`
                }`}
          </span>
        )}
      </div>
      <MealEntryFields
        index={index}
        unit={unit}
        amount={amount}
        extras={extras}
        note={note}
        onAmount={setAmount}
        onUnit={changeUnit}
        onExtras={setExtras}
        onNote={setNote}
      />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={
            mutation.isPending || !amount || !Number.isFinite(grams) || grams <= 0 || grams > 5000
          }
          onClick={() => mutation.mutate(grams < planned ? 'partial' : 'fed')}
          className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          Save meal
        </button>
        <button
          type="button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate('skipped')}
          className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
        >
          Skip
        </button>
        {preview !== null && (
          <span className="ml-auto text-sm font-bold text-teal-800">
            +{Math.round(preview)} kcal
          </span>
        )}
      </div>
      {mutation.error && (
        <p role="alert" className="mt-2 text-sm text-rose-700">
          {mutation.error.message}
        </p>
      )}
    </div>
  );
}
