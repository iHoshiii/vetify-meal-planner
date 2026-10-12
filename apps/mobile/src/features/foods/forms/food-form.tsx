import { Text, View } from 'react-native';
import { Button, ErrorMessage } from '../../../components/ui';
import { useFoodForm } from './use-food-form';
import { FoodFormFields } from './food-form-fields';
import { styles } from './food-form-styles';
import type { FoodDetails, FoodLabel } from '@vetify/planner-shared/foods';
import type { Pet } from '@vetify/planner-shared/pets';

export function FoodForm(props: FoodFormProps) {
  const state = useFoodForm(props);
  const { editing, pending, error, onCancel } = props;
  const { steps, step, lastStep, validation, setValidation, setStep, submit } = state;
  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          {editing ? 'Edit food' : 'Add food'}
        </Text>
        <Button label="Cancel" variant="ghost" compact disabled={pending} onPress={onCancel} />
      </View>
      <View style={styles.stepHeading}>
        <Text style={styles.stepTitle}>{steps[step]}</Text>
        <Text style={styles.progress}>
          {step + 1} / {steps.length}
        </Text>
      </View>
      <View style={styles.track}>
        {steps.map((name, index) => (
          <View key={name} style={[styles.segment, index <= step && styles.complete]} />
        ))}
      </View>
      <View style={styles.fields} pointerEvents={pending ? 'none' : 'auto'}>
        <FoodFormFields state={state} editing={editing} />
      </View>
      <ErrorMessage message={validation || error} />
      <View style={styles.actions}>
        {step > 0 && (
          <View style={styles.backAction}>
            <Button
              label="Back"
              variant="secondary"
              disabled={pending}
              onPress={() => {
                setValidation('');
                setStep(step - 1);
              }}
            />
          </View>
        )}
        <View style={styles.saveAction}>
          <Button
            label={pending ? 'Saving...' : step < lastStep ? 'Next' : 'Save food'}
            disabled={pending}
            onPress={submit}
          />
        </View>
      </View>
    </View>
  );
}

export type FoodFormProps = {
  pet: Pet;
  food?: FoodLabel;
  details?: FoodDetails;
  editing?: boolean;
  pending: boolean;
  error?: string;
  onSave: (food: FoodLabel, details: FoodDetails) => void;
  onCancel: () => void;
};
