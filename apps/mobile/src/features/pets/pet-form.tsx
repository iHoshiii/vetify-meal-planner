import { useEffect } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import type { Pet, PetInput } from '@vetify/planner-shared/pets';
import { Button, ErrorMessage, colors } from '../../components/ui';
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
  const state = usePetForm(pet, today, onSave);
  const { form, set, step } = state;
  const review = step === petSteps.length - 1;
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!pending) {
        if (step > 0) state.setStep(step - 1);
        else onCancel();
      }
      return true;
    });
    return () => listener.remove();
  }, [step, pending, onCancel, state.setStep]);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{pet ? `Edit ${pet.name}` : 'Add your pet'}</Text>
      <Text style={styles.progress}>
        Step {step + 1} of {petSteps.length}: {petSteps[step]}
      </Text>
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
          <Button
            label="Back"
            variant="secondary"
            disabled={pending}
            onPress={() => state.setStep(step - 1)}
          />
        )}
        <Button
          label={pending ? 'Saving...' : review ? 'Save pet' : 'Continue'}
          disabled={pending}
          onPress={state.submit}
        />
        <Button label="Cancel" variant="ghost" disabled={pending} onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  title: { color: colors.ink, fontSize: 25, fontWeight: '800' },
  progress: { color: colors.muted, fontSize: 14 },
  fields: { gap: 16 },
  actions: { gap: 10 },
});
