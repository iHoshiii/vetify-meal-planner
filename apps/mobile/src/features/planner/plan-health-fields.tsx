import type { MealPlanInput } from '@vetify/planner-shared/meal-plans';
import type { Pet } from '@vetify/planner-shared/pets';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { accountToday } from '../../auth/session';
import { Button, Choice, Field, Notice, Toggle } from '../../components/ui';
import { PlanNumberField } from './plan-number-field';

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
        label={`Date ${pet.name} was weighed`}
        value={value.weightMeasuredOn}
        placeholder="YYYY-MM-DD"
        maxLength={10}
        hint={`Use a date on or before ${accountToday()}.`}
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
        label="See the dog and cat body condition guide"
        variant="ghost"
        onPress={() =>
          void Linking.openURL(guide).catch(() =>
            Alert.alert('Guide unavailable', 'The body condition guide could not be opened.'),
          )
        }
      />
      <Choice
        label="How should this plan be made?"
        value={value.mode}
        options={[
          { label: 'Schedule an existing amount', value: 'manual' },
          { label: 'Estimate a starting amount', value: 'estimate' },
        ]}
        onChange={(mode) => update({ mode: mode as MealPlanInput['mode'] })}
      />
      {value.mode === 'estimate' && (
        <View style={styles.fields}>
          <Notice>
            Starting estimates are checked for adult weight maintenance using the pet details and
            food label.
          </Notice>
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
