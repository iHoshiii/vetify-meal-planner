import type { MealPlanInput } from '@vetify/planner-shared/meal-plans';
import type { Pet } from '@vetify/planner-shared/pets';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { Button, Choice, Field, Toggle } from '../../components/ui';
import { PlanNumberField } from './plan-number-field';
import { MuscleConditionChoice } from './muscle-condition-choice';

type Props = { pet: Pet; value: MealPlanInput; set: (value: MealPlanInput) => void };
const flags = [
  ['stableWeight', 'Weight has been stable'],
  ['growing', 'Still growing'],
  ['healthConcern', 'Health concern or food reaction'],
  ['prescribedDiet', 'On a prescribed diet'],
  ['appetiteChange', 'Recent appetite change'],
] as const;
const guide =
  'https://wsava.org/wp-content/uploads/2025/06/WSAVA_BCSCat_BCSDog_Nutrition_250612.pdf';

export function HealthFields({ pet, value, set }: Props) {
  const update = (patch: Partial<MealPlanInput>) => set({ ...value, ...patch });
  return (
    <View style={styles.fields}>
      <PlanNumberField
        label="Measured weight, kg"
        value={value.weightKg}
        emptyValue={0}
        onChange={(weightKg) => update({ weightKg: weightKg ?? 0 })}
      />
      <Field
        label="Date weighed"
        value={value.weightMeasuredOn}
        placeholder="YYYY-MM-DD"
        maxLength={10}
        onChangeText={(weightMeasuredOn) => update({ weightMeasuredOn })}
      />
      <Choice
        label="Body condition, 1 to 9 (optional)"
        value={String(value.conditionScore ?? '')}
        options={[
          { label: 'Not sure', value: '' },
          ...Array.from({ length: 9 }, (_, index) => ({
            label: `${index + 1} of 9`,
            value: String(index + 1),
          })),
        ]}
        onChange={(score) => update({ conditionScore: score ? Number(score) : null })}
      />
      <Button
        label="Body condition guide"
        variant="ghost"
        onPress={() =>
          void Linking.openURL(guide).catch(() =>
            Alert.alert('Guide unavailable', 'The body condition guide could not be opened.'),
          )
        }
      />
      <Choice
        label="Plan type"
        value={value.mode}
        options={[
          { label: 'Existing amount', value: 'manual' },
          { label: 'Starting estimate', value: 'estimate' },
        ]}
        onChange={(mode) => update({ mode: mode as MealPlanInput['mode'] })}
      />
      {value.mode === 'estimate' && (
        <View style={styles.fields}>
          {pet.species === 'cat' && (
            <MuscleConditionChoice
              value={value.muscleCondition ?? ''}
              onChange={(muscleCondition) => update({ muscleCondition })}
            />
          )}
          {flags.map(([key, label]) => (
            <Toggle
              key={key}
              label={label}
              value={value[key]}
              onValueChange={(checked) => update({ [key]: checked })}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ fields: { gap: 16 } });
