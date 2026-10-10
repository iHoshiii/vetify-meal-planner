import type { MealPlan } from '@vetify/planner-shared/meal-plans';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../components/app-icon';
import { Button, Card, ErrorMessage, colors } from '../../components/ui';
import { DailyBudget } from './daily-budget';
import { MealLogRow } from './meal-log-row';
import { PlanHealthNotice } from './plan-health-notice';
import { useDayLogs } from './use-day-logs';
import { usePlannerToday } from './use-planner-today';

export function PlanView({
  plan,
  history,
  onReview,
}: {
  plan: MealPlan;
  history: MealPlan[];
  onReview: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const today = usePlannerToday(plan.timeZone);
  const day = useDayLogs(plan, history, today);
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.title}>
          <Text accessibilityRole="header" style={styles.petName}>
            Tracker
          </Text>
          <Text style={styles.summary}>
            {today} · {plan.food.name}
          </Text>
        </View>
        <Button
          label="Review"
          icon={<AppIcon name="edit" size={15} color={colors.primary} />}
          variant="ghost"
          compact
          onPress={onReview}
        />
      </View>
      <View style={styles.screen}>
        {day.isLoading && <Text style={styles.detail}>Loading feeding logs...</Text>}
        {day.isError && (
          <Card>
            <ErrorMessage message="Logs could not be loaded." />
            <Button label="Try again" variant="secondary" onPress={() => void day.refetch()} />
          </Card>
        )}
        {!day.isError && !day.isLoading && (
          <>
            <DailyBudget plan={plan} logs={day.logs} earlier={day.earlier} />
            {plan.mealTimes.map((_, index) => (
              <MealLogRow
                key={`${plan.id}-${today}-${index}`}
                plan={plan}
                date={today}
                index={index}
                log={day.logs.find((item) => item.mealIndex === index)}
              />
            ))}
          </>
        )}
      </View>
      <PlanHealthNotice plan={plan} today={today} onReview={onReview} />
      <Card>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showHistory }}
          onPress={() => setShowHistory(!showHistory)}
          style={styles.historyToggle}
        >
          <View style={styles.title}>
            <Text style={styles.historyTitle}>Plan history</Text>
            <Text style={styles.detail}>Version {plan.version}</Text>
          </View>
          <View style={showHistory && styles.expandedChevron}>
            <AppIcon name="chevron-right" size={18} color={colors.muted} />
          </View>
        </Pressable>
        {showHistory && (
          <View style={styles.historyList}>
            <View style={styles.history}>
              <Text style={styles.historyTitle}>Version {plan.version} · Current</Text>
              <Text style={styles.detail}>
                {plan.preview.dailyGrams} g/day · {plan.createdAt.slice(0, 10)}
              </Text>
            </View>
            {history.slice(1).map((item) => (
              <View key={item.id} style={styles.history}>
                <Text style={styles.historyTitle}>
                  Version {item.version} · {item.food.name}
                </Text>
                <Text style={styles.detail}>
                  {item.preview.dailyGrams} g/day · {item.createdAt.slice(0, 10)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, gap: 4 },
  petName: { color: colors.ink, fontSize: 24, fontWeight: '700' },
  summary: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  detail: { color: colors.muted, fontSize: 13 },
  historyToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  expandedChevron: { transform: [{ rotate: '90deg' }] },
  historyList: { gap: 12 },
  history: { gap: 5, paddingTop: 12, borderTopColor: colors.border, borderTopWidth: 1 },
  historyTitle: { color: colors.ink, fontSize: 14, fontWeight: '600' },
});
