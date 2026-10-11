import { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  dietAssessmentInputSchema,
  type DailyDietAssessment,
} from '@vetify/planner-shared/daily-diet';
import type { Pet } from '@vetify/planner-shared/pets';
import { accountToday } from '../../auth/session';
import { useScreenActive } from '../../components/screen-activity';
import { Button, ErrorMessage, Field, colors } from '../../components/ui';

export type DietAssessmentFormProps = {
  pet: Pet;
  assessment?: DailyDietAssessment | null;
  today?: string;
  pending?: boolean;
  error?: string | null;
  onSave: (assessment: DailyDietAssessment) => void;
  onCancel: () => void;
};

type Answer = '' | 'yes' | 'no';
const reports = [
  ['stableWeight', 'Weight has been stable'],
  ['fullyGrown', 'Fully grown'],
  ['healthConcern', 'Health concern or food reaction'],
  ['prescribedDiet', 'On a prescribed diet'],
  ['appetiteChange', 'Recent appetite change'],
] as const;
type Report = (typeof reports)[number][0];
const steps = ['Weight and body condition', 'Health check'];
const measurementSchema = dietAssessmentInputSchema.pick({
  weightKg: true,
  weightMeasuredOn: true,
  conditionScore: true,
});
const answer = (value: boolean | undefined): Answer =>
  value === undefined ? '' : value ? 'yes' : 'no';

export function DietAssessmentForm(props: DietAssessmentFormProps) {
  return <AssessmentFields key={props.pet.id} {...props} />;
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
  const [weight, setWeight] = useState(String(assessment?.weightKg ?? pet.weightKg));
  const [measuredOn, setMeasuredOn] = useState(assessment?.weightMeasuredOn ?? today);
  const [condition, setCondition] = useState(assessment?.conditionScore?.toString() ?? '');
  const [answers, setAnswers] = useState<Record<Report, Answer>>(() => ({
    stableWeight: answer(assessment?.stableWeight),
    fullyGrown: answer(assessment ? !assessment.growing : undefined),
    healthConcern: answer(assessment?.healthConcern),
    prescribedDiet: answer(assessment?.prescribedDiet),
    appetiteChange: answer(assessment?.appetiteChange),
  }));
  const [step, setStep] = useState(0);
  const [validation, setValidation] = useState('');
  const active = useScreenActive();
  useEffect(() => {
    if (!active) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!pending) {
        if (step > 0) {
          setValidation('');
          setStep(step - 1);
        } else onCancel();
      }
      return true;
    });
    return () => subscription.remove();
  }, [active, step, pending, onCancel]);

  function submit() {
    if (pending) return;
    const measurement = measurementSchema.safeParse({
      weightKg: weight.trim() === '' ? Number.NaN : Number(weight),
      weightMeasuredOn: measuredOn,
      conditionScore: condition.trim() === '' ? null : Number(condition),
    });
    if (!measurement.success) {
      const field = measurement.error.issues[0]?.path[0];
      setValidation(
        field === 'weightKg'
          ? 'Enter a weight greater than 0 and no more than 500 kg.'
          : field === 'conditionScore'
            ? 'Use a whole body condition score from 1 to 9, or leave it blank.'
            : 'Enter a real measurement date (YYYY-MM-DD).',
      );
      return;
    }
    if (measurement.data.weightMeasuredOn > today) {
      setValidation('The measured date cannot be in the future.');
      return;
    }
    if (step === 0) {
      setValidation('');
      setStep(1);
      return;
    }
    if (reports.some(([key]) => answers[key] === '')) {
      setValidation('Please answer all five health questions.');
      return;
    }
    const parsed = dietAssessmentInputSchema.safeParse({
      petId: pet.id,
      ...measurement.data,
      stableWeight: answers.stableWeight === 'yes',
      growing: answers.fullyGrown === 'no',
      healthConcern: answers.healthConcern === 'yes',
      prescribedDiet: answers.prescribedDiet === 'yes',
      appetiteChange: answers.appetiteChange === 'yes',
    });
    if (!parsed.success) {
      setValidation('Check the assessment details.');
      return;
    }
    const { petId: _petId, ...result } = parsed.data;
    setValidation('');
    onSave(result);
  }
  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          Feeding assessment
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
            <Text style={styles.hint}>
              Owner-reported. Confirm the weight and date you measured.
            </Text>
            <Field
              label="Body condition, 1 to 9 (optional)"
              value={condition}
              onChangeText={(value) => {
                setCondition(value);
                setValidation('');
              }}
              keyboardType="number-pad"
              placeholder="Not sure"
              hint="4 or 5: healthy range. Other or unknown scores need review."
            />
          </>
        ) : (
          reports.map(([key, label]) => (
            <View key={key} style={styles.reportRow}>
              <Text style={styles.reportLabel}>{label}</Text>
              <View accessibilityRole="radiogroup" style={styles.answers}>
                {(['yes', 'no'] as const).map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLabel={`${label}: ${value === 'yes' ? 'Yes' : 'No'}`}
                    accessibilityState={{ checked: answers[key] === value, disabled: pending }}
                    disabled={pending}
                    onPress={() => {
                      setAnswers((current) => ({ ...current, [key]: value }));
                      setValidation('');
                    }}
                    style={[styles.option, answers[key] === value && styles.selected]}
                  >
                    <Text
                      style={[styles.optionText, answers[key] === value && styles.selectedText]}
                    >
                      {value === 'yes' ? 'Yes' : 'No'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))
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

const styles = StyleSheet.create({
  container: { gap: 14 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flex: 1, color: colors.ink, fontSize: 21, fontWeight: '700' },
  stepHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepTitle: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: '600' },
  progress: { color: colors.muted, fontSize: 13 },
  track: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border },
  complete: { backgroundColor: colors.primary },
  fields: { gap: 12 },
  measurementRow: { flexDirection: 'row', gap: 10 },
  field: { flex: 1, minWidth: 0 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  reportLabel: { flex: 1, color: colors.ink, fontSize: 13, lineHeight: 18 },
  answers: { flexDirection: 'row', gap: 6 },
  option: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: { backgroundColor: colors.soft, borderColor: colors.primary },
  optionText: { color: colors.ink, fontSize: 14 },
  selectedText: { color: colors.primary, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  backAction: { flex: 1, minWidth: 0 },
  saveAction: { flex: 2, minWidth: 0 },
});
