import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Pet } from '@vetify/planner-shared/pets';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePrincipal } from '../../auth/auth-boundary';
import { ownerQueryKey } from '../../auth/session';
import type { AppTab } from '../../components/app-tab-bar';
import { ScreenActivity, useScreenActive } from '../../components/screen-activity';
import { AppIcon } from '../../components/app-icon';
import { Button, Card, ErrorMessage, colors } from '../../components/ui';
import { getMealPlans } from '../../services/meal-plans.service';
import { FoodsScreen } from '../foods/foods-screen';
import { MonthlyProgressScreen } from '../progress/monthly-progress-screen';
import { PlanView } from './plan-view';
import { PlanWizard } from './plan-wizard';
import { usePlannerToday } from './use-planner-today';

export default function PlannerPage({
  pet,
  tab,
  onChangeTab,
}: {
  pet: Pet;
  tab: AppTab;
  onChangeTab: (tab: AppTab) => void;
}) {
  const active = useScreenActive();
  const principal = usePrincipal();
  const today = usePlannerToday(principal?.region.timeZone ?? 'Asia/Manila');
  const queryClient = useQueryClient();
  const [reviewing, setReviewing] = useState(false);
  const plans = useQuery({
    queryKey: ownerQueryKey('meal-plans', pet.id),
    queryFn: () => getMealPlans(pet.id),
  });
  const activePlan = plans.data?.find((plan) => !plan.endedAt);
  function reviewPlan() {
    setReviewing(true);
    onChangeTab('tracker');
  }
  return (
    <View style={{ flex: 1 }}>
      <ScreenActivity value={active && tab === 'tracker'}>
        <ScrollView
          style={{ display: tab === 'tracker' ? 'flex' : 'none' }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {plans.isPending ? (
            <ActivityIndicator accessibilityLabel="Loading meal plan" color={colors.primary} />
          ) : plans.isError ? (
            <Card>
              <ErrorMessage message={plans.error.message} />
              <Button label="Try again" onPress={() => void plans.refetch()} />
            </Card>
          ) : reviewing ? (
            <PlanWizard
              key={`${pet.id}-${activePlan?.version ?? 0}`}
              pet={pet}
              existingPlan={activePlan}
              onCancel={() => setReviewing(false)}
              onSaved={() => {
                void queryClient
                  .invalidateQueries({ queryKey: ownerQueryKey('meal-plans', pet.id) })
                  .then(() => setReviewing(false));
                void queryClient.invalidateQueries({
                  queryKey: ownerQueryKey('monthly-progress', pet.id),
                });
              }}
            />
          ) : activePlan ? (
            <PlanView
              key={activePlan.id}
              plan={activePlan}
              history={plans.data ?? []}
              onReview={reviewPlan}
            />
          ) : (
            <View style={styles.empty}>
              <Text accessibilityRole="header" style={styles.title}>
                Tracker
              </Text>
              <Card>
                <View style={styles.intro}>
                  <AppIcon name="bowl" size={32} />
                  <Text style={styles.emptyTitle}>Plan {pet.name}'s meals</Text>
                  <Text style={styles.detail}>Set their food, portions, and meal times.</Text>
                </View>
                <Button label="Create meal plan" onPress={reviewPlan} />
              </Card>
            </View>
          )}
        </ScrollView>
      </ScreenActivity>
      <ScreenActivity value={active && tab === 'foods'}>
        <View style={{ flex: 1, display: tab === 'foods' ? 'flex' : 'none' }}>
          <FoodsScreen pet={pet} activeFood={activePlan?.food} onPlanMeals={reviewPlan} />
        </View>
      </ScreenActivity>
      {tab === 'progress' && (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <MonthlyProgressScreen
            pet={pet}
            today={today}
            plan={activePlan}
            onReviewPlan={reviewPlan}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 28,
    gap: 16,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  empty: { gap: 16 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '700' },
  intro: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  detail: { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
