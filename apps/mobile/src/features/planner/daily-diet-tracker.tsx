import { useQueries } from '@tanstack/react-query';
import {
  estimateDailyDietTargets,
  legacyFeedingNutrition,
  summarizeDailyDiet,
  type DailyDietAssessment,
  type DailyDietSummary,
} from '@vetify/planner-shared/daily-diet';
import type { MealPlan } from '@vetify/planner-shared/meal-plans';
import type { Pet } from '@vetify/planner-shared/pets';
import { todayInTimeZone } from '@vetify/planner-shared/planner-date';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ownerQueryKey } from '../../auth/session';
import { AppIcon } from '../../components/app-icon';
import { Button, Card, ErrorMessage, colors } from '../../components/ui';
import { feedingMessage, shortDate } from '../../components/presentation';
import {
  useDietAssessment,
  useDietEntries,
  useRemoveDietEntry,
  useSaveDietAssessment,
} from '../../services/diet-queries';
import { getFeedingLogs } from '../../services/meal-plans.service';
import { DietAssessmentForm } from './diet-assessment-form';

type DailyDietTrackerProps = {
  pet: Pet;
  today: string;
  timeZone?: string;
  plans: MealPlan[];
  onFoods: () => void;
  onAssessmentEditingChange?: (editing: boolean) => void;
};

export function DailyDietTracker(props: DailyDietTrackerProps) {
  return <Tracker key={`${props.pet.id}:${props.pet.species}`} {...props} />;
}

function Tracker({
  pet,
  today,
  timeZone,
  plans,
  onFoods,
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
  if (settingUp)
    return (
      <DietAssessmentForm
        pet={pet}
        today={today}
        assessment={confirmed}
        pending={save.isPending}
        error={save.error?.message}
        onCancel={() => {
          setSettingUp(false);
        }}
        onSave={(input) =>
          save.mutate(
            { petId: pet.id, ...input },
            {
              onSuccess: () => {
                setSettingUp(false);
              },
            },
          )
        }
      />
    );
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.identity}>
          <Text accessibilityRole="header" style={styles.title}>
            Tracker
          </Text>
        </View>
        <Button label="Add food" variant="secondary" compact onPress={onFoods} />
      </View>
      {loading ? (
        <ActivityIndicator accessibilityLabel="Loading daily diet" color={colors.primary} />
      ) : error ? (
        <Card>
          <ErrorMessage message={error.message} />
          <Button
            label="Try again"
            variant="secondary"
            onPress={() => {
              void diary.refetch();
              void assessment.refetch();
              feeding.forEach((query) => void query.refetch());
            }}
          />
        </Card>
      ) : (
        <>
          <Card>
            <View style={styles.header}>
              <Text style={styles.sectionTitle}>Daily target</Text>
              {(pet.species === 'dog' || pet.species === 'cat') && (
                <Button
                  label={confirmed ? 'Update' : 'Set target'}
                  variant="ghost"
                  compact
                  onPress={() => {
                    save.reset();
                    setSettingUp(true);
                  }}
                />
              )}
            </View>
            <DailyDietTable summary={summary} />
            {targets.status !== 'estimated' &&
              targets.blockers[0] !==
                'Confirm a current weight and feeding assessment to estimate daily targets.' && (
                <Text style={styles.detail}>
                  {feedingMessage(targets.blockers[0] ?? 'Review the feeding plan.')}
                </Text>
              )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Daily target details"
              accessibilityState={{ expanded: detailsOpen }}
              onPress={() => setDetailsOpen(!detailsOpen)}
              style={styles.detailsButton}
            >
              <Text style={styles.link}>Target details</Text>
              <AppIcon name="chevron-down" size={14} />
            </Pressable>
            {detailsOpen && (
              <View style={styles.screen}>
                {targets.status === 'estimated' && (
                  <Text style={styles.detail}>
                    Weight: {targets.weightKg} kg. Targets are starting estimates.
                  </Text>
                )}
                {targets.blockers.map((blocker) => (
                  <Text key={blocker} style={styles.detail}>
                    {feedingMessage(blocker)}
                  </Text>
                ))}
                <Text style={styles.detail}>
                  Protein and fat are minimums. Carbs have no fixed target. Meeting these values
                  does not confirm a complete diet.
                </Text>
                <View style={styles.header}>
                  <Button
                    label="AAHA"
                    compact
                    variant="ghost"
                    onPress={() => void Linking.openURL(targets.sources.energy)}
                  />
                  <Button
                    label="FEDIAF"
                    compact
                    variant="ghost"
                    onPress={() => void Linking.openURL(targets.sources.nutrients)}
                  />
                </View>
              </View>
            )}
          </Card>
          <View style={styles.header}>
            <Text style={styles.sectionTitle}>Today's diet</Text>
            <Text style={styles.detail}>{shortDate(today)}</Text>
          </View>
          {(diary.data ?? []).length === 0 && <Text style={styles.detail}>No food recorded.</Text>}
          {(diary.data ?? []).map((entry) => (
            <Card key={entry.id}>
              <View style={styles.header}>
                <View style={styles.identity}>
                  <Text style={styles.foodName}>{entry.food.name}</Text>
                  <Text style={styles.detail}>
                    {entry.grams} g ·{' '}
                    {entry.nutrition.kcal === null
                      ? 'Unknown kcal'
                      : `${Math.round(entry.nutrition.kcal * 10) / 10} kcal`}
                  </Text>
                </View>
                <Button
                  label="Remove"
                  compact
                  variant="ghost"
                  accessibilityLabel={`Remove: ${entry.food.name}`}
                  disabled={remove.isPending}
                  onPress={() => remove.mutate(entry.id)}
                />
              </View>
            </Card>
          ))}
          {feedingRows.length > 0 && (
            <Text style={styles.detail}>Includes scheduled meals. Log each portion once.</Text>
          )}
          <ErrorMessage message={remove.error?.message} />
        </>
      )}
    </View>
  );
}

export function DailyDietTable({ summary }: { summary: DailyDietSummary }) {
  const display = (value: number | null) =>
    value === null ? 'N/A' : String(Math.round(value * 10) / 10);
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <Text style={styles.nutrient}></Text>
        {['Target', 'Added', 'Remaining'].map((title) => (
          <Text key={title} style={styles.tableHeading}>
            {title}
          </Text>
        ))}
      </View>
      {(
        [
          ['kcal', 'Calories', 'kcal'],
          ['proteinG', 'Protein min.', 'g'],
          ['fatG', 'Fat min.', 'g'],
          ['carbsG', 'Carbs', 'g'],
        ] as const
      ).map(([key, label, unit]) => {
        const row = summary[key];
        const added = row.total === null ? 'Unknown' : display(row.total);
        const remaining =
          row.remaining !== null && row.remaining < 0
            ? `${display(-row.remaining)} over`
            : display(row.remaining);
        return (
          <View
            key={key}
            style={styles.tableRow}
            accessibilityLabel={`${label}: target ${display(row.target)} ${unit}, added ${added} ${unit}, remaining ${remaining} ${unit}`}
          >
            <View style={styles.nutrient}>
              <Text style={styles.nutrientName}>{label}</Text>
              <Text style={styles.unit}>{unit}</Text>
            </View>
            <Text style={styles.tableValue}>{display(row.target)}</Text>
            <Text style={styles.tableValue}>{added}</Text>
            <Text style={[styles.tableValue, styles.remaining]}>{remaining}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  identity: { flex: 1, minWidth: 0, gap: 4 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '700' },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '600', flex: 1 },
  foodName: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  detail: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  link: { color: colors.primary, fontSize: 13 },
  detailsButton: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 6 },
  table: { gap: 4 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 42,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  nutrient: { flex: 1.2, minWidth: 0 },
  nutrientName: { color: colors.ink, fontSize: 12, fontWeight: '500' },
  unit: { color: colors.muted, fontSize: 10 },
  tableHeading: { flex: 1, fontSize: 10, color: colors.muted, textAlign: 'right' },
  tableValue: { flex: 1, minWidth: 0, fontSize: 12, color: colors.ink, textAlign: 'right' },
  remaining: { color: colors.primary, fontWeight: '600' },
});
