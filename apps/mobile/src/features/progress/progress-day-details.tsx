import type { MonthlyProgressDay } from '@vetify/planner-shared/monthly-progress';

import { Text, View } from 'react-native';

import { Card } from '../../components/ui';

import { styles } from './monthly-progress-styles';

export function dateLabel(date: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${date}T12:00:00.000Z`).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    ...options,
  });
}
export function dayLabel(day: MonthlyProgressDay) {
  if (day.status === 'future') return `${day.date}: Future day`;
  if (day.status === 'unlogged') return `${day.date}: No food recorded`;
  return `${day.date}: ${day.mealsLogged} recorded meals, ${day.foodsLogged ?? 0} added foods, ${day.kcal === null ? 'calories unknown' : `${Math.round(day.kcal)} kcal`}`;
}

export function ProgressDayDetails({ selected }: { selected: MonthlyProgressDay }) {
  return (
    <Card>
      <Text style={styles.sectionTitle}>
        {dateLabel(selected.date, { weekday: 'short', month: 'short', day: 'numeric' })}
      </Text>
      {selected.targetPlanVersion !== null && (
        <Text style={styles.detail}>
          Plan v{selected.targetPlanVersion} ·{' '}
          {selected.targetKcal !== null
            ? `${Math.round(selected.targetKcal)} kcal`
            : selected.targetGrams !== null
              ? `${selected.targetGrams} g`
              : 'Unknown amount'}{' '}
          planned
        </Text>
      )}
      {selected.targetDietReference && (
        <Text style={styles.detail}>
          {selected.targetKcal === null
            ? 'Daily reference needs review.'
            : `Daily reference · ${Math.round(selected.targetKcal)} kcal`}
        </Text>
      )}
      {selected.status === 'unlogged' ? (
        <Text style={styles.detail}>No food recorded.</Text>
      ) : (
        selected.entries.map((entry, index) => (
          <View key={`${entry.planId}-${entry.mealIndex}-${index}`} style={styles.entry}>
            <View style={styles.entryTitle}>
              <Text style={styles.label}>
                Meal {entry.mealIndex + 1}
                {entry.status === 'skipped' ? ' · Skipped' : ''}
              </Text>
              <Text style={styles.small}>
                {entry.foodName ?? 'Food unavailable'}
                {entry.planVersion !== null ? ` · v${entry.planVersion}` : ''}
              </Text>
              {entry.note ? <Text style={styles.small}>{entry.note}</Text> : null}
            </View>
            <View style={styles.entryValues}>
              <Text style={styles.label}>
                {entry.grams === null ? 'Unknown g' : `${Math.round(entry.grams * 1000) / 1000} g`}
              </Text>
              <Text style={styles.small}>
                {entry.kcal === null ? 'Unknown kcal' : `${Math.round(entry.kcal)} kcal`}
              </Text>
            </View>
          </View>
        ))
      )}
      {(selected.foodEntries ?? []).map((entry) => (
        <View key={entry.id} style={styles.entry}>
          <View style={styles.entryTitle}>
            <Text style={styles.label}>{entry.food.name}</Text>
          </View>
          <View style={styles.entryValues}>
            <Text style={styles.label}>{entry.grams} g</Text>
            <Text style={styles.small}>
              {entry.nutrition.kcal === null
                ? 'Unknown kcal'
                : `${Math.round(entry.nutrition.kcal)} kcal`}
            </Text>
          </View>
        </View>
      ))}
      {selected.status === 'recorded' && (
        <Text style={styles.detail}>
          Logged total:{' '}
          {selected.grams === null
            ? 'unknown grams'
            : `${Math.round(selected.grams * 1000) / 1000} g`}{' '}
          · {selected.kcal === null ? 'unknown calories' : `${Math.round(selected.kcal)} kcal`}
        </Text>
      )}
    </Card>
  );
}
