import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { dietAssessmentInputSchema } from '@vetify/planner-shared/daily-diet';

import { accountToday } from '../../auth/session';
import { useScreenActive } from '../../components/screen-activity';

import { type MuscleCondition } from './muscle-condition-choice';

import type { DietAssessmentFormProps } from './diet-assessment-form';
type Answer = '' | 'yes' | 'no';
export const reports = [
  ['stableWeight', 'Weight has been stable'],
  ['fullyGrown', 'Fully grown'],
  ['healthConcern', 'Health concern or food reaction'],
  ['prescribedDiet', 'On a prescribed diet'],
  ['appetiteChange', 'Recent appetite change'],
] as const;
type Report = (typeof reports)[number][0];
export const steps = ['Weight and body condition', 'Health check'];
const measurementSchema = dietAssessmentInputSchema.pick({
  weightKg: true,
  weightMeasuredOn: true,
  conditionScore: true,
});
const answer = (value: boolean | undefined): Answer =>
  value === undefined ? '' : value ? 'yes' : 'no';

export function useDietAssessmentForm({
  pet,
  assessment,
  today = accountToday(),
  pending = false,
  onSave,
  onCancel,
}: DietAssessmentFormProps) {
  const [weight, setWeight] = useState(String(assessment?.weightKg ?? pet.weightKg));
  const [measuredOn, setMeasuredOn] = useState(assessment?.weightMeasuredOn ?? today);
  const [condition, setCondition] = useState(assessment?.conditionScore?.toString() ?? '');
  const [muscleCondition, setMuscleCondition] = useState<MuscleCondition | ''>(
    pet.species === 'cat' ? (assessment?.muscleCondition ?? '') : '',
  );
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
    if (pet.species === 'cat' && muscleCondition === '') {
      setValidation('Choose a muscle condition, or select Not sure.');
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
      ...(pet.species === 'cat' ? { muscleCondition } : {}),
    });
    if (!parsed.success) {
      setValidation('Check the assessment details.');
      return;
    }
    const { petId: _petId, ...result } = parsed.data;
    setValidation('');
    onSave(result);
  }
  return {
    weight,
    setWeight,
    measuredOn,
    setMeasuredOn,
    condition,
    setCondition,
    muscleCondition,
    setMuscleCondition,
    answers,
    setAnswers,
    step,
    setStep,
    validation,
    setValidation,
    submit,
  };
}
export type DietAssessmentFields = ReturnType<typeof useDietAssessmentForm>;
