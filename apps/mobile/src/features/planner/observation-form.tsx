import { useState } from 'react';
import type { MealPlan } from '@vetify/planner-shared/meal-plans';
import {
  nutritionObservationSchema,
  type NutritionObservationInput,
} from '@vetify/planner-shared/nutrition-observations';
import { StyleSheet, View } from 'react-native';
import { Button, Choice, ErrorMessage, Field, Notice } from '../../components/ui';

export function ObservationForm({
  plan,
  today,
  pending,
  error,
  saved,
  onSave,
}: {
  plan: MealPlan;
  today: string;
  pending: boolean;
  error?: string;
  saved: boolean;
  onSave: (input: NutritionObservationInput) => void;
}) {
  const [weight, setWeight] = useState(String(plan.petWeightKg));
  const [date, setDate] = useState(today);
  const [condition, setCondition] = useState(String(plan.conditionScore ?? ''));
  const [observer, setObserver] = useState<'owner' | 'veterinarian'>('owner');
  const [validation, setValidation] = useState<string>();
  function submit() {
    const parsed = nutritionObservationSchema.safeParse({
      petId: plan.petId,
      weightKg: Number(weight),
      measuredOn: date.trim(),
      conditionScore: condition === '' ? null : Number(condition),
      observer,
    });
    if (!parsed.success) {
      setValidation(parsed.error.issues[0]?.message ?? 'Check the measurement details.');
      return;
    }
    if (parsed.data.measuredOn > today) {
      setValidation('The measurement date cannot be in the future.');
      return;
    }
    setValidation(undefined);
    onSave(parsed.data);
  }
  return (
    <View style={styles.form}>
      <Field
        label="Weight, kg"
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
      />
      <Field
        label="Measured on"
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        maxLength={10}
        hint={`Use YYYY-MM-DD. Latest date: ${today}.`}
      />
      <Choice
        label="Condition, 1 to 9"
        value={condition}
        onChange={setCondition}
        options={[
          { label: 'Not sure', value: '' },
          ...Array.from({ length: 9 }, (_, index) => ({
            label: `${index + 1} of 9`,
            value: String(index + 1),
          })),
        ]}
      />
      <Choice
        label="Who measured?"
        value={observer}
        onChange={(value) => setObserver(value === 'veterinarian' ? 'veterinarian' : 'owner')}
        options={[
          { label: 'Owner', value: 'owner' },
          { label: 'Veterinarian', value: 'veterinarian' },
        ]}
      />
      <Button label={pending ? 'Saving...' : 'Record weight'} onPress={submit} disabled={pending} />
      <ErrorMessage message={validation ?? error} />
      {saved && !validation && <Notice>Measurement saved.</Notice>}
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: 14 } });
