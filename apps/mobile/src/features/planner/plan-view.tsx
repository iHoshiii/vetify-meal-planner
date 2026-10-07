import type { MealPlan } from '@vetify/planner-shared/meal-plans';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Choice, ErrorMessage, colors } from '../../components/ui';
import { DailyBudget } from './daily-budget';
import { MealLogRow } from './meal-log-row';
import { PlanProgress } from './plan-progress';
import { PlanWeek } from './plan-week';
import { useDayLogs } from './use-day-logs';
import { usePlannerToday } from './use-planner-today';

export function PlanView({
  plan,
  history,
  onReview,
  onBack,
}: {
  plan: MealPlan;
  history: MealPlan[];
  onReview: () => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState('today');
  const [showHistory, setShowHistory] = useState(false);
  const today = usePlannerToday(plan.timeZone);
  const day = useDayLogs(plan, history, today);
  return (
    <View style={styles.screen}>
      <Button label="All pets" variant="ghost" onPress={onBack} />
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Active feeding plan</Text>
        <Text style={styles.petName}>{plan.petName}</Text>
        <Text style={styles.summary}>
          {plan.food.name} / {plan.preview.dailyGrams} g each day
        </Text>
        <Button label="Review plan" variant="secondary" onPress={onReview} />
      </View>
      <Choice
        label="View schedule"
        value={tab}
        onChange={setTab}
        options={[
          { label: 'Today', value: 'today' },
          { label: 'Week', value: 'week' },
        ]}
      />
      <Text style={styles.detail}>
        Plan version {plan.version}
        {history.length > 1 ? ` / ${history.length - 1} previous` : ''}
      </Text>
      {tab === 'today' ? (
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
      ) : (
        <PlanWeek plan={plan} today={today} />
      )}
      <PlanProgress key={plan.id} plan={plan} today={today} onReview={onReview} />
      {history.length > 1 && (
        <Card>
          <Button
            label={showHistory ? 'Hide previous plans' : 'Previous plans'}
            variant="ghost"
            onPress={() => setShowHistory(!showHistory)}
          />
          {showHistory &&
            history.slice(1).map((item) => (
              <View key={item.id} style={styles.history}>
                <Text style={styles.historyTitle}>
                  Version {item.version} / {item.food.name}
                </Text>
                <Text style={styles.detail}>
                  {item.preview.dailyGrams} g/day / {item.createdAt.slice(0, 10)}
                </Text>
              </View>
            ))}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 16 },
  hero: { backgroundColor: colors.primary, borderRadius: 24, padding: 24, gap: 12 },
  eyebrow: { color: '#d9eee5', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  petName: { color: colors.white, fontSize: 32, fontWeight: '800' },
  summary: { color: colors.white, fontSize: 15, lineHeight: 22 },
  detail: { color: colors.muted, fontSize: 13 },
  history: { gap: 6, paddingTop: 12, borderTopColor: colors.border, borderTopWidth: 1 },
  historyTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
});
