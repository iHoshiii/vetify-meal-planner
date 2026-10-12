import type { MealPlan } from '@vetify/planner-shared/meal-plans';
import { StyleSheet, Text, View } from 'react-native';
import { Card, colors } from '../../components/ui';

function nextDays(today: string) {
  const origin = new Date(`${today}T12:00:00Z`);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(origin);
    day.setUTCDate(day.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}

export function PlanWeek({ plan, today }: { plan: MealPlan; today: string }) {
  return (
    <View style={styles.list}>
      {nextDays(today).map((date) => (
        <Card key={date}>
          <Text style={styles.heading}>
            {new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, {
              timeZone: 'UTC',
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          <Text style={styles.detail}>
            {plan.food.name} / {plan.preview.dailyGrams} g planned
          </Text>
          {plan.mealTimes.map((time, index) => (
            <Text key={index} style={styles.meal}>
              {time} / {plan.preview.mealGrams[index]} g
            </Text>
          ))}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  heading: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  detail: { color: colors.muted, fontSize: 13 },
  meal: { color: colors.ink, fontSize: 15 },
});
