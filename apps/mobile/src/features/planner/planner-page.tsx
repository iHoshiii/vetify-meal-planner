import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Pet } from '@vetify/planner-shared/pets';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { usePrincipal } from '../../auth/auth-boundary';
import { ownerQueryKey } from '../../auth/session';
import type { AppTab } from '../../components/app-tab-bar';
import { ScreenActivity, useScreenActive } from '../../components/screen-activity';
import { Button, Card, ErrorMessage, colors } from '../../components/ui';
import { getMealPlans } from '../../services/meal-plans.service';
import { FoodsScreen } from '../foods/foods-screen';
import { MonthlyProgressScreen } from '../progress/monthly-progress-screen';
import { PlanView } from './plan-view';
import { PlanWizard } from './plan-wizard';
import { DailyDietTracker } from './daily-diet-tracker';
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
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [assessmentEditing, setAssessmentEditing] = useState(false);
  const plans = useQuery({
    queryKey: ownerQueryKey('meal-plans', pet.id),
    queryFn: () => getMealPlans(pet.id),
  });
  const activePlan = plans.data?.find((plan) => !plan.endedAt);
  function reviewPlan() {
    setAssessmentEditing(false);
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
                void Promise.all([
                  queryClient.invalidateQueries({ queryKey: ownerQueryKey('meal-plans', pet.id) }),
                  queryClient.invalidateQueries({
                    queryKey: ownerQueryKey('diet-assessment', pet.id),
                  }),
                ]).then(() => setReviewing(false));
                void queryClient.invalidateQueries({
                  queryKey: ownerQueryKey('monthly-progress', pet.id),
                });
              }}
            />
          ) : (
            <>
              <DailyDietTracker
                pet={pet}
                today={today}
                timeZone={principal?.region.timeZone ?? 'Asia/Manila'}
                plans={plans.data ?? []}
                onFoods={() => onChangeTab('foods')}
                onAssessmentEditingChange={setAssessmentEditing}
              />
              {!assessmentEditing &&
                (activePlan ? (
                  <>
                    <Button
                      label={scheduleOpen ? 'Hide meal schedule' : 'Meal schedule'}
                      variant="secondary"
                      onPress={() => setScheduleOpen(!scheduleOpen)}
                    />
                    {scheduleOpen && (
                      <PlanView
                        key={activePlan.id}
                        plan={activePlan}
                        history={plans.data ?? []}
                        onReview={reviewPlan}
                        showBudget={false}
                      />
                    )}
                  </>
                ) : (
                  <Button label="Set meal times" variant="secondary" onPress={reviewPlan} />
                ))}
            </>
          )}
        </ScrollView>
      </ScreenActivity>
      <ScreenActivity value={active && tab === 'foods'}>
        <View style={{ flex: 1, display: tab === 'foods' ? 'flex' : 'none' }}>
          <FoodsScreen pet={pet} today={today} activeFood={activePlan?.food} />
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
});
