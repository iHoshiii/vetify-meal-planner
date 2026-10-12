import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MealPlan } from '@vetify/planner-shared/meal-plans';
import { StyleSheet, Text, View } from 'react-native';
import { ownerQueryKey } from '../../auth/session';
import { Button, Card, ErrorMessage, Notice, colors } from '../../components/ui';
import {
  getNutritionObservations,
  saveNutritionObservation,
} from '../../services/nutrition-observations.service';
import { ObservationForm } from './observation-form';

export function PlanProgress({
  plan,
  today,
  onReview,
}: {
  plan: MealPlan;
  today: string;
  onReview: () => void;
}) {
  const queryClient = useQueryClient();
  const observations = useQuery({
    queryKey: ownerQueryKey('nutrition-observations', plan.petId),
    queryFn: () => getNutritionObservations(plan.petId),
  });
  const mutation = useMutation({
    mutationFn: saveNutritionObservation,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: ownerQueryKey('nutrition-observations', plan.petId),
        }),
        queryClient.invalidateQueries({ queryKey: ownerQueryKey('monthly-progress', plan.petId) }),
      ]),
  });
  const latest = observations.data?.find((item) => item.measuredOn >= plan.weightMeasuredOn);
  const weightChange = latest ? Math.abs(latest.weightKg - plan.petWeightKg) / plan.petWeightKg : 0;
  const score = latest?.conditionScore;
  const conditionChanged = score !== null && score !== undefined && score !== plan.conditionScore;
  const lastWeightOn = latest?.measuredOn ?? plan.weightMeasuredOn;
  const staleWeight =
    Date.parse(`${today}T00:00:00Z`) - Date.parse(`${lastWeightOn}T00:00:00Z`) > 30 * 86400000;
  const reviewNeeded =
    weightChange >= 0.05 ||
    conditionChanged ||
    staleWeight ||
    (score !== null && score !== undefined && (score < 4 || score > 5));
  return (
    <Card>
      <Text style={styles.heading}>Weight and condition</Text>
      <Text style={styles.detail}>
        Plan started at {plan.petWeightKg} kg on {plan.weightMeasuredOn}.
      </Text>
      {reviewNeeded && (
        <Notice tone="warning">
          Review the feeding plan after changes in weight or condition, or an older weight
          measurement.
        </Notice>
      )}
      {reviewNeeded && <Button label="Review this plan" variant="secondary" onPress={onReview} />}
      <ObservationForm
        key={plan.id}
        plan={plan}
        today={today}
        pending={mutation.isPending}
        error={mutation.error?.message}
        saved={mutation.isSuccess}
        onSave={(input) => mutation.mutate(input)}
      />
      {observations.isLoading && <Text style={styles.detail}>Loading measurements...</Text>}
      {observations.isError && (
        <View style={styles.history}>
          <ErrorMessage message="Measurements could not be loaded." />
          <Button
            label="Try again"
            variant="secondary"
            onPress={() => void observations.refetch()}
          />
        </View>
      )}
      {Boolean(observations.data?.length) && (
        <View style={styles.history}>
          <Text style={styles.label}>Recent measurements</Text>
          {observations.data?.slice(0, 5).map((item) => (
            <View key={item.id} style={styles.row}>
              <Text style={styles.detail}>{item.measuredOn}</Text>
              <Text style={styles.measurement}>
                {item.weightKg} kg{item.conditionScore ? ` / ${item.conditionScore} of 9` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  detail: { color: colors.muted, fontSize: 14 },
  label: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  history: { gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  measurement: { color: colors.ink, fontSize: 14, fontWeight: '700' },
});
