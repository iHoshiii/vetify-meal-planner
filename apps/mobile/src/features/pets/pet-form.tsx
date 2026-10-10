import { useEffect } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import type { Pet, PetInput } from '@vetify/planner-shared/pets';
import { Button, ErrorMessage, colors } from '../../components/ui';
import { useScreenActive } from '../../components/screen-activity';
import { PetBasics } from './pet-basics';
import { PetAgeCare } from './pet-age-care';
import { PetFoodWeight } from './pet-food-weight';
import { PetHealth } from './pet-health';
import { PetReview } from './pet-review';
import { petSteps } from './pet-form-values';
import { usePetForm } from './use-pet-form';

type Props = {
  pet?: Pet;
  today: string;
  pending: boolean;
  error?: string;
  onSave: (input: PetInput) => void;
  onCancel: () => void;
};

export function PetForm({ pet, today, pending, error, onSave, onCancel }: Props) {
  const active = useScreenActive();
  const state = usePetForm(pet, today, onSave);
  const { form, set, step } = state;
  const review = step === petSteps.length - 1;
  useEffect(() => {
    if (!active) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!pending) {
        if (step > 0) state.setStep(step - 1);
        else onCancel();
      }
      return true;
    });
    return () => listener.remove();
  }, [active, step, pending, onCancel, state.setStep]);
  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text style={styles.title}>{pet ? 'Edit pet' : 'Add pet'}</Text>
        <Button label="Cancel" variant="ghost" compact disabled={pending} onPress={onCancel} />
      </View>
      <View style={styles.stepHeading}>
        <Text style={styles.stepTitle}>{petSteps[step]}</Text>
        <Text style={styles.progress} accessibilityLabel={`Step ${step + 1} of ${petSteps.length}`}>
          {step + 1} / {petSteps.length}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        {petSteps.map((label, index) => (
          <View
            key={label}
            style={[styles.progressSegment, index <= step && styles.progressComplete]}
          />
        ))}
      </View>
      <View pointerEvents={pending ? 'none' : 'auto'} style={styles.fields}>
        {step === 0 && <PetBasics form={form} set={set} />}
        {step === 1 && (
          <PetAgeCare
            form={form}
            set={set}
            setAge={state.setAge}
            setAgeUnit={state.setAgeUnit}
            setBirthMonth={state.setBirthMonth}
          />
        )}
        {step === 2 && <PetFoodWeight form={form} set={set} />}
        {step === 3 && <PetHealth form={form} set={set} />}
        {review && <PetReview form={form} onEdit={state.edit} />}
      </View>
      <ErrorMessage message={state.error || error} />
      <View style={styles.actions}>
        {step > 0 && (
          <View style={styles.backAction}>
            <Button
              label="Back"
              variant="secondary"
              disabled={pending}
              onPress={() => state.setStep(step - 1)}
            />
          </View>
        )}
        <View style={styles.continueAction}>
          <Button
            label={pending ? 'Saving...' : review ? 'Save pet' : 'Continue'}
            disabled={pending}
            onPress={state.submit}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { color: colors.ink, fontSize: 23, fontWeight: '700', flex: 1 },
  stepHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepTitle: { color: colors.ink, fontSize: 16, fontWeight: '600', flex: 1 },
  progress: { color: colors.muted, fontSize: 13 },
  progressTrack: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  progressSegment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border },
  progressComplete: { backgroundColor: colors.primary },
  fields: { gap: 14 },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  backAction: { flex: 1, minWidth: 0 },
  continueAction: { flex: 2, minWidth: 0 },
});
