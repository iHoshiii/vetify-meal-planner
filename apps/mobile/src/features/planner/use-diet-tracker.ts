import { useQueries } from '@tanstack/react-query';
import {
  estimateDailyDietTargets,
  legacyFeedingNutrition,
  summarizeDailyDiet,
  type DailyDietAssessment,
} from '@vetify/planner-shared/daily-diet';
import type { MealPlan } from '@vetify/planner-shared/meal-plans';
import type { Pet } from '@vetify/planner-shared/pets';
import { todayInTimeZone } from '@vetify/planner-shared/planner-date';
import { useEffect, useState } from 'react';

import { ownerQueryKey } from '../../auth/session';

import {
  useDietAssessment,
  useDietEntries,
  useRemoveDietEntry,
  useSaveDietAssessment,
} from '../../services/diet-queries';
import { getFeedingLogs } from '../../services/meal-plans.service';

export type DailyDietTrackerProps = {
  pet: Pet;
  today: string;
  timeZone?: string;
  plans: MealPlan[];
  onFoods: () => void;
  onAssessmentEditingChange?: (editing: boolean) => void;
};

export function useDietTracker({
  pet,
  today,
  timeZone,
  plans,
  onAssessmentEditingChange,
}: DailyDietTrackerProps) {
  const diary = useDietEntries(pet.id, today);
  const assessment = useDietAssessment(pet.id, today, pet.updatedAt, timeZone);
  const save = useSaveDietAssessment();
  const remove = useRemoveDietEntry(pet.id, today);
  const [settingUp, setSettingUp] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  useEffect(() => {
    onAssessmentEditingChange?.(settingUp);
  }, [settingUp, onAssessmentEditingChange]);
  const relevantPlans = plans.filter(
    (plan) => !plan.endedAt || todayInTimeZone(plan.timeZone, new Date(plan.endedAt)) === today,
  );
  const feeding = useQueries({
    queries: relevantPlans.map((plan) => ({
      queryKey: ownerQueryKey('feeding-logs', plan.id, today),
      queryFn: () => getFeedingLogs(plan.id, today),
    })),
  });
  const activePlan = plans.find((plan) => !plan.endedAt);
  const confirmed: DailyDietAssessment | null =
    assessment.data ??
    (pet.species === 'dog' && activePlan
      ? {
          weightKg: activePlan.weightKg,
          weightMeasuredOn: activePlan.weightMeasuredOn,
          conditionScore: activePlan.conditionScore,
          stableWeight: activePlan.stableWeight,
          growing: activePlan.growing,
          healthConcern: activePlan.healthConcern,
          prescribedDiet: activePlan.prescribedDiet,
          appetiteChange: activePlan.appetiteChange,
          ...(activePlan.muscleCondition === undefined
            ? {}
            : { muscleCondition: activePlan.muscleCondition }),
        }
      : null);
  const targets = estimateDailyDietTargets(pet, today, confirmed);
  const feedingRows = relevantPlans.flatMap((plan, index) =>
    (feeding[index].data ?? []).map((log) => legacyFeedingNutrition(plan, log)),
  );
  const summary = summarizeDailyDiet([...(diary.data ?? []), ...feedingRows], targets);
  const loading =
    diary.isPending || assessment.isPending || feeding.some((query) => query.isPending);
  const error = diary.error ?? assessment.error ?? feeding.find((query) => query.error)?.error;
  return {
    diary,
    assessment,
    save,
    remove,
    settingUp,
    setSettingUp,
    detailsOpen,
    setDetailsOpen,
    feeding,
    confirmed,
    targets,
    feedingRows,
    summary,
    loading,
    error,
  };
}
export type DietTrackerState = ReturnType<typeof useDietTracker>;
