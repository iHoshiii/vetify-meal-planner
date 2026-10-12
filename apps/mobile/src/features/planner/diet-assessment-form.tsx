import { Text, View } from 'react-native';
import { type DailyDietAssessment } from '@vetify/planner-shared/daily-diet';
import type { Pet } from '@vetify/planner-shared/pets';
import { accountToday } from '../../auth/session';

import { Button, ErrorMessage, Field } from '../../components/ui';

import { useDietAssessmentForm, steps } from './use-diet-assessment';
import { AssessmentHealthFields } from './assessment-health-fields';
import { styles } from './diet-assessment-styles';
export type DietAssessmentFormProps = {
  pet: Pet;
  assessment?: DailyDietAssessment | null;
  today?: string;
  pending?: boolean;
  error?: string | null;
  onSave: (assessment: DailyDietAssessment) => void;
  onCancel: () => void;
};

export function DietAssessmentForm(props: DietAssessmentFormProps) {
  return <AssessmentFields key={`${props.pet.id}:${props.pet.species}`} {...props} />;
}

function AssessmentFields({
  pet,
  assessment,
  today = accountToday(),
  pending = false,
  error,
  onSave,
  onCancel,
}: DietAssessmentFormProps) {
  const fields = useDietAssessmentForm({
    pet,
    assessment,
    today,
    pending,
    error,
    onSave,
    onCancel,
  });
  const {
    weight,
    setWeight,
    measuredOn,
    setMeasuredOn,
    condition,
    setCondition,
    step,
    setStep,
    validation,
    setValidation,
    submit,
  } = fields;
  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          Daily target
        </Text>
        <Button label="Cancel" variant="ghost" compact disabled={pending} onPress={onCancel} />
      </View>
      <View style={styles.stepHeading}>
        <Text style={styles.stepTitle}>{steps[step]}</Text>
        <Text style={styles.progress}>{step + 1} / 2</Text>
      </View>
      <View style={styles.track}>
        {steps.map((name, index) => (
          <View key={name} style={[styles.segment, index <= step && styles.complete]} />
        ))}
      </View>
      <View style={styles.fields} pointerEvents={pending ? 'none' : 'auto'}>
        {step === 0 ? (
          <>
            <View style={styles.measurementRow}>
              <View style={styles.field}>
                <Field
                  label="Weight, kg"
                  value={weight}
                  onChangeText={(value) => {
                    setWeight(value);
                    setValidation('');
                  }}
                  keyboardType="decimal-pad"
                  placeholder="Measured weight"
                />
              </View>
              <View style={styles.field}>
                <Field
                  label="Date weighed"
                  value={measuredOn}
                  onChangeText={(value) => {
                    setMeasuredOn(value);
                    setValidation('');
                  }}
                  maxLength={10}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>
            <Field
              label="Body condition, 1 to 9 (optional)"
              value={condition}
              onChangeText={(value) => {
                setCondition(value);
                setValidation('');
              }}
              keyboardType="number-pad"
              placeholder="Not sure"
              hint="Unknown or other scores may need review."
            />
          </>
        ) : (
          <>
            <AssessmentHealthFields pet={pet} pending={pending} fields={fields} />
          </>
        )}
      </View>
      <ErrorMessage message={validation || error || undefined} />
      <View style={styles.actions}>
        {step > 0 && (
          <View style={styles.backAction}>
            <Button
              label="Back"
              variant="secondary"
              disabled={pending}
              onPress={() => {
                setValidation('');
                setStep(0);
              }}
            />
          </View>
        )}
        <View style={styles.saveAction}>
          <Button
            label={pending ? 'Saving...' : step === 0 ? 'Next' : 'Save assessment'}
            disabled={pending}
            onPress={submit}
          />
        </View>
      </View>
    </View>
  );
}
