import { useMutation, useQueryClient } from '@tanstack/react-query';
import { foodKcalPerGram, GRAMS_PER_OUNCE, mealKcal } from '@vetify/planner-shared/meal-intake';
import {
  feedingLogInputSchema,
  type FeedingLog,
  type FeedingLogInput,
  type MealPlan,
} from '@vetify/planner-shared/meal-plans';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ownerQueryKey } from '../../auth/session';
import { Button, Card, ErrorMessage, colors } from '../../components/ui';
import { saveFeedingLog } from '../../services/meal-plans.service';
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
      return queryClient.invalidateQueries({
        queryKey: ownerQueryKey('feeding-logs', plan.id, date),
      });
    },
  });
  function changeUnit(next: 'g' | 'oz') {
    if (amount.trim() && Number.isFinite(grams))
      setAmount(mass(grams / (next === 'oz' ? GRAMS_PER_OUNCE : 1)));
    unitRef.current = next;
    setUnit(next);
  }
  return (
    <Card>
      <Text style={styles.label}>
        Meal {index + 1} / {plan.mealTimes[index]}
      </Text>
      <Text style={styles.heading}>{plan.food.name}</Text>
      <Text style={styles.detail}>{planned} g planned</Text>
      {log && (
        <Text style={styles.saved} accessibilityLiveRegion="polite">
          {log.status === 'skipped'
            ? 'Skipped'
            : `${mass(log.actualGrams ?? 0)} g / ${savedKcal === null ? '? kcal' : `${Math.round(savedKcal)} kcal`}`}
        </Text>
      )}
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
      {!extrasValid && (
        <ErrorMessage message="Extras must be between 0 and 5000 kcal, or left blank." />
      )}
      <View style={styles.actions}>
        <Button
          label={mutation.isPending ? 'Saving...' : 'Save meal'}
          disabled={mutation.isPending || !amountValid || !extrasValid}
          onPress={() => mutation.mutate(grams < planned ? 'partial' : 'fed')}
        />
        <Button
          label="Skip"
          variant="secondary"
          disabled={mutation.isPending || !extrasValid}
          onPress={() => mutation.mutate('skipped')}
        />
      </View>
      {preview !== null && (
        <Text style={styles.saved}>{Math.round(preview)} kcal in this entry</Text>
      )}
      <ErrorMessage message={mutation.error?.message} />
    </Card>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  heading: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  detail: { color: colors.muted, fontSize: 14 },
  saved: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
