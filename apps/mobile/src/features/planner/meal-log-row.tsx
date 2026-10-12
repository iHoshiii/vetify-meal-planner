import { type FeedingLog, type MealPlan } from '@vetify/planner-shared/meal-plans';

import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../components/app-icon';
import { Button, Card, ErrorMessage, colors } from '../../components/ui';

import { MealEntryFields } from './meal-entry-fields';

const mass = (value: number) => String(Math.round(value * 1000) / 1000);

import { useMealLog } from './use-meal-log';
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
  const {
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
  } = useMealLog(plan, date, index, log);
  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.mealTitle}>
          <AppIcon name="bowl" size={18} color={colors.primary} />
          <Text style={styles.label}>Meal {index + 1}</Text>
        </View>
        <View style={styles.headerActions}>
          <Text style={styles.time}>{plan.mealTimes[index]}</Text>
          {editing && (
            <Button
              label="Close"
              accessibilityLabel={`Close meal ${index + 1}`}
              variant="ghost"
              compact
              disabled={mutation.isPending}
              onPress={() => setEditing(false)}
            />
          )}
        </View>
      </View>
      <Text style={styles.heading}>
        {planned} g <Text style={styles.detail}>planned</Text>
      </Text>
      {log && (
        <Text style={styles.saved} accessibilityLiveRegion="polite">
          {log.status === 'skipped'
            ? 'Skipped'
            : `${mass(log.actualGrams ?? 0)} g / ${savedKcal === null ? '? kcal' : `${Math.round(savedKcal)} kcal`}`}
        </Text>
      )}
      {editing && (
        <View style={styles.entry}>
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
        </View>
      )}
      {!extrasValid && (
        <ErrorMessage message="Extras must be between 0 and 5000 kcal, or left blank." />
      )}
      <View style={styles.actions}>
        <View style={styles.action}>
          {editing ? (
            <Button
              label={mutation.isPending ? 'Saving...' : 'Save meal'}
              accessibilityLabel={`Save meal ${index + 1}`}
              disabled={mutation.isPending || !amountValid || !extrasValid}
              onPress={() => mutation.mutate(grams < planned ? 'partial' : 'fed')}
            />
          ) : (
            <Button
              label={log && log.status !== 'skipped' ? 'Edit meal' : 'Log meal'}
              accessibilityLabel={`${log && log.status !== 'skipped' ? 'Edit' : 'Log'} meal ${index + 1}`}
              variant={log && log.status !== 'skipped' ? 'secondary' : 'primary'}
              disabled={mutation.isPending}
              onPress={() => setEditing(true)}
            />
          )}
        </View>
        <View style={styles.action}>
          <Button
            label="Skip"
            accessibilityLabel={`Skip meal ${index + 1}`}
            variant="ghost"
            disabled={mutation.isPending || !extrasValid}
            onPress={() => mutation.mutate('skipped')}
          />
        </View>
      </View>
      {editing && preview !== null && (
        <Text style={styles.saved}>{Math.round(preview)} kcal in this entry</Text>
      )}
      <ErrorMessage message={mutation.error?.message} />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  mealTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: colors.ink, fontWeight: '600', fontSize: 14 },
  time: { color: colors.muted, fontSize: 13 },
  heading: { color: colors.ink, fontSize: 22, fontWeight: '700' },
  detail: { color: colors.muted, fontSize: 13, fontWeight: '400' },
  saved: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  entry: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, minWidth: 0 },
});
