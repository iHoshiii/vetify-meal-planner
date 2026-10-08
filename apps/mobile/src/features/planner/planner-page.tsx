import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Pet } from '@vetify/planner-shared/pets';
import { useEffect, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePrincipal } from '../../auth/auth-boundary';
import { ownerQueryKey } from '../../auth/session';
import { Button, ErrorMessage, colors } from '../../components/ui';
import { getMealPlans } from '../../services/meal-plans.service';
import { PetsScreen } from '../pets/pets-screen';
import { PlanView } from './plan-view';
import { PlanWizard } from './plan-wizard';
import { usePlannerToday } from './use-planner-today';

export default function PlannerPage() {
  const principal = usePrincipal();
  const today = usePlannerToday(principal?.region.timeZone ?? 'Asia/Manila');
  const queryClient = useQueryClient();
  const [pet, setPet] = useState<Pet | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const plans = useQuery({
    queryKey: ownerQueryKey('meal-plans', pet?.id),
    queryFn: () => getMealPlans(pet!.id),
    enabled: Boolean(pet),
  });
  const activePlan = plans.data?.[0];
  useEffect(() => {
    if (!pet || reviewing || (!plans.isLoading && !plans.isError && !activePlan)) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      setPet(null);
      return true;
    });
    return () => listener.remove();
  }, [pet, reviewing, activePlan, plans.isLoading, plans.isError]);
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {!pet ? (
        <PetsScreen
          today={today}
          onOpenPet={(selected) => {
            setReviewing(false);
            setPet(selected);
          }}
        />
      ) : plans.isLoading ? (
        <View style={styles.loading}>
          <Text style={styles.text}>Loading the meal plan...</Text>
          <Button label="All pets" variant="ghost" onPress={() => setPet(null)} />
        </View>
      ) : plans.isError ? (
        <View style={styles.loading}>
          <ErrorMessage message="The meal plan could not be loaded." />
          <Button label="Try again" onPress={() => void plans.refetch()} />
          <Button label="All pets" variant="ghost" onPress={() => setPet(null)} />
        </View>
      ) : reviewing || !activePlan ? (
        <PlanWizard
          key={`${pet.id}-${activePlan?.version ?? 0}`}
          pet={pet}
          existingPlan={activePlan}
          onCancel={() => (activePlan ? setReviewing(false) : setPet(null))}
          onSaved={() => {
            void queryClient
              .invalidateQueries({ queryKey: ownerQueryKey('meal-plans', pet.id) })
              .then(() => setReviewing(false));
          }}
        />
      ) : (
        <PlanView
          key={activePlan.id}
          plan={activePlan}
          history={plans.data ?? []}
          onReview={() => setReviewing(true)}
          onBack={() => setPet(null)}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48, gap: 20 },
  loading: { gap: 16 },
  text: { color: colors.muted, fontSize: 15 },
});
