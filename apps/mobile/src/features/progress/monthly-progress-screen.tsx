import { useQuery } from '@tanstack/react-query';
import type { MealPlan } from '@vetify/planner-shared/meal-plans';
import type { MonthlyProgressDay } from '@vetify/planner-shared/monthly-progress';
import type { Pet } from '@vetify/planner-shared/pets';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ownerQueryKey } from '../../auth/session';
import { AppIcon } from '../../components/app-icon';
import { Button, Card, colors, ErrorMessage } from '../../components/ui';
import { getMonthlyProgress } from '../../services/progress.service';
import { PlanHealthNotice } from '../planner/plan-health-notice';
import { PlanProgress } from '../planner/plan-progress';

function moveMonth(month: string, offset: number) {
  const date = new Date(`${month}-01T12:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}
function dateLabel(date: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${date}T12:00:00.000Z`).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    ...options,
  });
}
function dayLabel(day: MonthlyProgressDay) {
  if (day.status === 'future') return `${day.date}: Future day`;
  if (day.status === 'unlogged') return `${day.date}: No meals recorded`;
  return `${day.date}: ${day.mealsLogged} recorded meals, ${day.kcal === null ? 'calories unknown' : `${Math.round(day.kcal)} kcal`}`;
}

export function MonthlyProgressScreen({
  pet,
  today,
  plan,
  onReviewPlan,
}: {
  pet: Pet;
  today: string;
  plan?: MealPlan;
  onReviewPlan: () => void;
}) {
  const currentMonth = today.slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [selectedDate, setSelectedDate] = useState(today);
  const [measurementOpen, setMeasurementOpen] = useState(false);
  useEffect(() => {
    if (month > currentMonth) {
      setMonth(currentMonth);
      setSelectedDate(today);
    }
  }, [month, currentMonth, today]);
  const progress = useQuery({
    queryKey: ownerQueryKey('monthly-progress', pet.id, month),
    queryFn: () => getMonthlyProgress(pet.id, month),
  });
  const data = progress.data;
  const selected = data?.days.find((day) => day.date === selectedDate);
  const offset = new Date(`${month}-01T12:00:00.000Z`).getUTCDay();
  function navigate(offset: number) {
    const next = moveMonth(month, offset);
    if (next > currentMonth || next < '1000-01') return;
    setMonth(next);
    setSelectedDate(next === currentMonth ? today : `${next}-01`);
  }
  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.heading}>
        Monthly progress
      </Text>
      <View style={styles.monthNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => navigate(-1)}
          style={styles.monthButton}
        >
          <AppIcon name="chevron-left" color={colors.ink} />
        </Pressable>
        <Text accessibilityLiveRegion="polite" style={styles.monthTitle}>
          {dateLabel(`${month}-01`, { month: 'long', year: 'numeric' })}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: month >= currentMonth }}
          disabled={month >= currentMonth}
          onPress={() => navigate(1)}
          style={[styles.monthButton, month >= currentMonth && styles.disabled]}
        >
          <AppIcon name="chevron-right" color={colors.ink} />
        </Pressable>
      </View>
      {progress.isPending && (
        <ActivityIndicator color={colors.primary} accessibilityLabel="Loading monthly progress" />
      )}
      {progress.isError && (
        <Card>
          <ErrorMessage message="Monthly progress could not be loaded." />
          <Button label="Try again" variant="secondary" onPress={() => void progress.refetch()} />
        </Card>
      )}
      {data && (
        <>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{data.summary.recordedDays}</Text>
              <Text style={styles.detail}>Days recorded</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {data.summary.knownLoggedKcal === null
                  ? 'N/A'
                  : Math.round(data.summary.knownLoggedKcal)}
              </Text>
              <Text style={styles.detail}>Kcal on known days</Text>
            </View>
          </View>
          {data.summary.unknownCalorieDays > 0 && (
            <Text style={styles.detail}>
              {data.summary.unknownCalorieDays} recorded{' '}
              {data.summary.unknownCalorieDays === 1 ? 'day has' : 'days have'} unknown calories.
            </Text>
          )}
          <Card>
            <View style={styles.calendar}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((name) => (
                <Text key={name} style={styles.weekday}>
                  {name}
                </Text>
              ))}
              {Array.from({ length: offset }, (_, index) => (
                <View key={`empty-${index}`} style={styles.cell} />
              ))}
              {data.days.map((day) => (
                <Pressable
                  key={day.date}
                  accessibilityRole="button"
                  accessibilityLabel={dayLabel(day)}
                  accessibilityState={{
                    selected: selectedDate === day.date,
                    disabled: day.status === 'future',
                  }}
                  disabled={day.status === 'future'}
                  onPress={() => setSelectedDate(day.date)}
                  style={styles.cell}
                >
                  <View style={[styles.day, selectedDate === day.date && styles.selectedDay]}>
                    <Text
                      style={[
                        styles.dayNumber,
                        day.status === 'future' && styles.future,
                        selectedDate === day.date && styles.selectedNumber,
                      ]}
                    >
                      {Number(day.date.slice(-2))}
                    </Text>
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor:
                            day.status === 'recorded'
                              ? day.kcal === null
                                ? '#b7791f'
                                : colors.primary
                              : 'transparent',
                        },
                      ]}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                <Text style={styles.small}>Recorded</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: '#b7791f' }]} />
                <Text style={styles.small}>Unknown kcal</Text>
              </View>
            </View>
          </Card>
          {selected && (
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
              {selected.status === 'unlogged' ? (
                <Text style={styles.detail}>No meals recorded.</Text>
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
                        {entry.grams === null
                          ? 'Unknown g'
                          : `${Math.round(entry.grams * 1000) / 1000} g`}
                      </Text>
                      <Text style={styles.small}>
                        {entry.kcal === null ? 'Unknown kcal' : `${Math.round(entry.kcal)} kcal`}
                      </Text>
                    </View>
                  </View>
                ))
              )}
              {selected.status === 'recorded' && (
                <Text style={styles.detail}>
                  Logged total:{' '}
                  {selected.grams === null
                    ? 'unknown grams'
                    : `${Math.round(selected.grams * 1000) / 1000} g`}{' '}
                  ·{' '}
                  {selected.kcal === null
                    ? 'unknown calories'
                    : `${Math.round(selected.kcal)} kcal`}
                </Text>
              )}
            </Card>
          )}
          <Card>
            <Text style={styles.sectionTitle}>Measurements</Text>
            {data.measurements.length === 0 ? (
              <Text style={styles.detail}>No measurements recorded this month.</Text>
            ) : (
              data.measurements.map((item) => (
                <View key={item.id} style={styles.measurement}>
                  <Text style={styles.detail}>
                    {dateLabel(item.measuredOn, { month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={styles.label}>
                    {item.weightKg} kg
                    {item.conditionScore === null ? '' : ` · Condition ${item.conditionScore}/9`}
                  </Text>
                </View>
              ))
            )}
          </Card>
        </>
      )}
      {plan && <PlanHealthNotice plan={plan} today={today} onReview={onReviewPlan} />}
      {plan ? (
        <>
          <Button
            label={measurementOpen ? 'Close measurement form' : 'Add measurement'}
            variant="secondary"
            onPress={() => setMeasurementOpen(!measurementOpen)}
          />
          {measurementOpen && (
            <PlanProgress key={plan.id} plan={plan} today={today} onReview={onReviewPlan} />
          )}
        </>
      ) : (
        <Text style={styles.detail}>Set up a meal plan to add measurements.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 16 },
  heading: { color: colors.ink, fontSize: 22, fontWeight: '700' },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monthButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthTitle: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  disabled: { opacity: 0.35 },
  stats: { flexDirection: 'row', gap: 12 },
  stat: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    gap: 5,
  },
  statValue: { color: colors.ink, fontSize: 26, fontWeight: '700' },
  detail: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  small: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  label: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  calendar: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: {
    width: '14.2857%',
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  cell: { width: '14.2857%', height: 48, alignItems: 'center', justifyContent: 'center' },
  day: {
    width: 36,
    height: 42,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  selectedDay: { backgroundColor: colors.soft },
  dayNumber: { color: colors.ink, fontSize: 13 },
  selectedNumber: { color: colors.primary, fontWeight: '700' },
  future: { color: '#cbd5e1' },
  dot: { width: 5, height: 5, borderRadius: 3 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  entry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  entryTitle: { flex: 1, gap: 3 },
  entryValues: { alignItems: 'flex-end', gap: 3 },
  measurement: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
});
