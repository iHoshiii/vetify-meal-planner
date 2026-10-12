import { useQuery } from '@tanstack/react-query';
import type { MealPlan } from '@vetify/planner-shared/meal-plans';

import type { Pet } from '@vetify/planner-shared/pets';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { ownerQueryKey } from '../../auth/session';
import { AppIcon } from '../../components/app-icon';
import { Button, Card, colors, ErrorMessage } from '../../components/ui';
import { getMonthlyProgress } from '../../services/progress.service';
import { PlanHealthNotice } from '../planner/plan-health-notice';
import { PlanProgress } from '../planner/plan-progress';

import { MonthlyCalendar } from './monthly-calendar';
import { dateLabel, ProgressDayDetails } from './progress-day-details';
import { ProgressStats, ProgressMeasurements } from './progress-summary';
import { styles } from './monthly-progress-styles';
function moveMonth(month: string, offset: number) {
  const date = new Date(`${month}-01T12:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
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
        Progress
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
          <ProgressStats data={data} />
          <MonthlyCalendar
            data={data}
            offset={offset}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
          {selected && <ProgressDayDetails selected={selected} />}
          <ProgressMeasurements data={data} />
        </>
      )}
      {plan && !measurementOpen && (
        <PlanHealthNotice plan={plan} today={today} onReview={onReviewPlan} />
      )}
      {plan ? (
        <>
          <Button
            label={measurementOpen ? 'Close' : 'Add measurement'}
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
