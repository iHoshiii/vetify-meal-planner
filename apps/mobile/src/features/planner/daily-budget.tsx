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
      <Text style={styles.label}>Today's intake</Text>
      <Text style={styles.balance} accessibilityLiveRegion="polite">
        {left === null
          ? 'No target'
          : `${Math.round(Math.abs(left))} ${unit} ${left < 0 ? 'over' : 'left'}`}
      </Text>
      <Text style={styles.detail}>
        {Math.round(consumed)} / {target === null ? '?' : Math.round(target)} {unit}
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
      {!exact && (
        <Text style={styles.hint}>Calorie balance needs a food label and known extras.</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  balance: { color: colors.ink, fontSize: 30, fontWeight: '800' },
  detail: { color: colors.muted, fontSize: 14 },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.background, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  hint: { color: colors.muted, fontSize: 12 },
});
