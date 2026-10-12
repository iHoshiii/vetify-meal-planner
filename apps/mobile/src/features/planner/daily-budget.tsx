import { dailyIntake } from '@vetify/planner-shared/meal-intake';
import type { FeedingLog, MealPlan } from '@vetify/planner-shared/meal-plans';
import { StyleSheet, Text, View } from 'react-native';
import { Card, colors } from '../../components/ui';

export function DailyBudget({
  plan,
  logs,
  earlier = [],
}: {
  plan: MealPlan;
  logs: FeedingLog[];
  earlier?: Array<{ plan: MealPlan; logs: FeedingLog[] }>;
}) {
  const intake = dailyIntake(plan, logs, earlier);
  const exact = intake.remainingKcal !== null;
  const left = exact ? intake.remainingKcal! : intake.gramsRemaining;
  const target = exact ? intake.targetKcal! : plan.preview.dailyGrams;
  const consumed = exact ? intake.consumedKcal! : intake.gramsEaten;
  const unit = exact ? 'kcal' : 'g';
  const progress = target ? Math.min(100, Math.max(0, (consumed / target) * 100)) : 0;
  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.label}>Daily intake</Text>
        <Text
          style={[styles.balance, left !== null && left < 0 && styles.over]}
          accessibilityLiveRegion="polite"
        >
          {left === null
            ? 'Target unavailable'
            : `${Math.round(Math.abs(left))} ${unit} ${left < 0 ? 'over' : 'left'}`}
        </Text>
      </View>
      <Text style={styles.amount}>
        {Math.round(consumed)}
        <Text style={styles.target}>
          {' '}
          / {target === null ? '?' : Math.round(target)} {unit}
        </Text>
      </Text>
      <View
        style={styles.track}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Daily intake progress"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(progress) }}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${progress}%`,
              backgroundColor: left !== null && left < 0 ? '#c78520' : colors.primary,
            },
          ]}
        />
      </View>
      {exact && (
        <View style={styles.foodSummary}>
          <Text style={styles.detail}>{Math.round(intake.gramsEaten)} g food logged</Text>
          {plan.preview.dailyGrams !== null && (
            <Text style={styles.detail}>{plan.preview.dailyGrams} g/day planned</Text>
          )}
        </View>
      )}
      {!exact && (
        <Text style={styles.hint}>Calorie balance needs a food label and known extras.</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  balance: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  over: { color: '#9a6700' },
  amount: { color: colors.ink, fontSize: 27, fontWeight: '700' },
  target: { color: colors.muted, fontSize: 14, fontWeight: '400' },
  detail: { color: colors.muted, fontSize: 12 },
  foodSummary: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.background, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
