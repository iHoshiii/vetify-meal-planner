import type { MealPlanInput, MealPlanPreview } from '@vetify/planner-shared/meal-plans';
import type { Pet } from '@vetify/planner-shared/pets';
import { StyleSheet, Text, View } from 'react-native';
import { colors, Notice } from '../../components/ui';

export function PlanReview({
  pet,
  input,
  preview,
}: {
  pet: Pet;
  input: MealPlanInput;
  preview: MealPlanPreview;
}) {
  return (
    <View style={styles.content}>
      <View style={styles.summary}>
        <Text style={styles.heading}>{pet.name}</Text>
        <Text style={styles.amount}>
          {preview.dailyGrams === null
            ? 'Daily amount unavailable'
            : `${preview.dailyGrams} g per day`}
        </Text>
        <Text style={styles.text}>
          {input.mode === 'manual' ? 'Existing amount' : 'Starting estimate'}
        </Text>
      </View>
      <View style={styles.detail}>
        <Text style={styles.heading}>{input.food.name}</Text>
        <Text style={styles.text}>
          {input.food.adequacy === 'complete'
            ? 'Complete food, as entered from label'
            : 'Food adequacy not confirmed'}
        </Text>
        {input.food.calories !== null && (
          <Text style={styles.text}>
            {input.food.calories} kcal/{input.food.calorieBasis === 'kg' ? 'kg' : 'package'}
          </Text>
        )}
        {preview.dailyKcal !== null && (
          <Text style={styles.text}>
            {input.mode === 'manual' ? 'Entered daily amount' : 'Starting estimate'}:{' '}
            {Math.round(preview.dailyKcal)} kcal/day.
            {input.mode === 'estimate'
              ? ` Includes ${input.extrasKcal} kcal of extras. Factor ${preview.factor}.`
              : ''}
          </Text>
        )}
        <Text style={styles.text}>
          Weight: {input.weightKg} kg, measured {input.weightMeasuredOn}.
        </Text>
      </View>
      {input.mealTimes.map((time, index) => (
        <View key={index} style={styles.meal}>
          <Text style={styles.text}>
            Meal {index + 1}, {time}
          </Text>
          <Text style={styles.heading}>{preview.mealGrams[index] ?? 'Unavailable'} g</Text>
        </View>
      ))}
      {preview.warnings.length > 0 && (
        <Notice tone="warning">{preview.warnings.join('\n\n')}</Notice>
      )}
      {preview.blockers.length > 0 && (
        <Notice tone="error">{`This plan cannot be saved yet.\n\n${preview.blockers.join('\n\n')}`}</Notice>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  summary: { backgroundColor: '#e7f3ee', borderRadius: 16, padding: 18, gap: 6 },
  detail: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16, gap: 8 },
  heading: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  amount: { color: colors.primary, fontSize: 26, fontWeight: '800' },
  text: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  meal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
});
