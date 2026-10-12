import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import type { MealPlan } from '@vetify/planner-shared/meal-plans';
import { ownerQueryKey } from '../../auth/session';
import { Button, Notice } from '../../components/ui';
import { getNutritionObservations } from '../../services/nutrition-observations.service';

export function PlanHealthNotice({
  plan,
  today,
  onReview,
}: {
  plan: MealPlan;
  today: string;
  onReview: () => void;
}) {
  const observations = useQuery({
    queryKey: ownerQueryKey('nutrition-observations', plan.petId),
    queryFn: () => getNutritionObservations(plan.petId),
  });
  const latest = observations.data?.find((item) => item.measuredOn >= plan.weightMeasuredOn);
  const score = latest?.conditionScore;
  const weightChange = latest ? Math.abs(latest.weightKg - plan.petWeightKg) / plan.petWeightKg : 0;
  const conditionChanged = score !== null && score !== undefined && score !== plan.conditionScore;
  const staleWeight =
    Date.parse(`${today}T00:00:00Z`) -
      Date.parse(`${latest?.measuredOn ?? plan.weightMeasuredOn}T00:00:00Z`) >
    30 * 86400000;
  if (!(
    weightChange >= 0.05 ||
    conditionChanged ||
    staleWeight ||
    (score !== null && score !== undefined && (score < 4 || score > 5))
  ))
    return null;
  return (
    <View style={{ gap: 8 }}>
      <Notice tone="warning">
        Review the plan after weight or condition changes, or an older measurement.
      </Notice>
      <Button label="Review plan" variant="secondary" compact onPress={onReview} />
    </View>
  );
}
