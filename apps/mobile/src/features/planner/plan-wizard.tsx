import type { MealPlan } from '@vetify/planner-shared/meal-plans';
import type { Pet } from '@vetify/planner-shared/pets';
import { useEffect } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { Button, Card, colors, ErrorMessage, Notice } from '../../components/ui';
import { useScreenActive } from '../../components/screen-activity';
import { FoodFields } from './plan-food-fields';
import { HealthFields } from './plan-health-fields';
import { PlanReview } from './plan-review';
import { PlanSchedule } from './plan-schedule';
import { usePlanWizard } from './use-plan-wizard';

const steps = ['Pet and health', 'Food and extras', 'Meal times', 'Review and save'];

export function PlanWizard({
  pet,
  existingPlan,
  onCancel,
  onSaved,
}: {
  pet: Pet;
  existingPlan?: MealPlan;
  onCancel: () => void;
  onSaved: (plan: MealPlan) => void;
}) {
  const active = useScreenActive();
  const {
    input,
    step,
    preview,
    error,
    draftError,
    loading,
    busy,
    checking,
    saving,
    update,
    next,
    back,
    save,
  } = usePlanWizard(pet, existingPlan, onSaved);

  useEffect(() => {
    if (!active) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!busy) {
        if (step > 0) back();
        else onCancel();
      }
      return true;
    });
    return () => listener.remove();
  }, [active, step, busy, back, onCancel]);

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.title}>
          <Text style={styles.heading}>{existingPlan ? 'Review plan' : 'New meal plan'}</Text>
          <Text style={styles.kicker}>
            {pet.name} · Step {step + 1} of 4
          </Text>
        </View>
        <Button label="Close" variant="ghost" compact onPress={onCancel} disabled={busy} />
      </View>
      <View accessibilityLabel="Plan progress" style={styles.progress}>
        {steps.map((name, index) => (
          <View key={name} style={[styles.segment, index <= step && styles.active]} />
        ))}
      </View>
      {loading ? (
        <Notice>Loading your plan draft...</Notice>
      ) : (
        <View style={styles.content} pointerEvents={busy ? 'none' : 'auto'}>
          <Text accessibilityRole="header" style={styles.subheading}>
            {steps[step]}
          </Text>
          {step === 0 && <HealthFields pet={pet} value={input} set={update} />}
          {step === 1 && <FoodFields pet={pet} value={input} set={update} />}
          {step === 2 && <PlanSchedule value={input} set={update} />}
          {step === 3 && preview && <PlanReview pet={pet} input={input} preview={preview} />}
        </View>
      )}
      {draftError ? <Notice tone="warning">{draftError}</Notice> : null}
      <ErrorMessage message={error} />
      <View style={styles.actions}>
        {step > 0 && (
          <View style={styles.action}>
            <Button label="Back" variant="secondary" disabled={busy} onPress={back} />
          </View>
        )}
        <View style={styles.action}>
          {step < 3 ? (
            <Button
              label={checking ? 'Checking...' : 'Next'}
              disabled={loading || busy}
              onPress={() => void next()}
            />
          ) : (
            <Button
              label={saving ? 'Saving...' : 'Save plan'}
              disabled={busy || !preview || preview.blockers.length > 0}
              onPress={save}
            />
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, gap: 4 },
  kicker: { color: colors.muted, fontSize: 12 },
  heading: { color: colors.ink, fontSize: 21, fontWeight: '700' },
  subheading: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  content: { gap: 14 },
  progress: { flexDirection: 'row', gap: 6 },
  segment: { height: 3, borderRadius: 3, backgroundColor: colors.border, flex: 1 },
  active: { backgroundColor: colors.primary },
  actions: { flexDirection: 'row', gap: 10, paddingTop: 4 },
  action: { flex: 1 },
});
