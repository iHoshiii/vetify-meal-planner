import { View } from 'react-native';
import { isShihTzu, SHIH_TZU_TYPICAL_ADULT_MAX_KG } from '@vetify/planner-shared/pets';
import { Choice, Field, Notice } from '../../components/ui';
import type { PetFormValues, PetStepProps } from './pet-form-values';

export function PetFoodWeight({ form, set }: PetStepProps) {
  const aboveTypical =
    isShihTzu(form.species, form.breed) && Number(form.weightKg) > SHIH_TZU_TYPICAL_ADULT_MAX_KG;
  return (
    <View style={{ gap: 16 }}>
      <Field
        label="Current weight (kg)"
        value={form.weightKg}
        onChangeText={(value) => set('weightKg', value)}
        keyboardType="decimal-pad"
        placeholder="6.2"
      />
      {aboveTypical && (
        <Notice tone="warning">
          Adult Shih Tzu breed standard: 4.5 to 8 kg. Double-check this weight.
        </Notice>
      )}
      <Field
        label="Current food (optional)"
        value={form.currentFood}
        onChangeText={(value) => set('currentFood', value)}
        placeholder="Brand and recipe"
        maxLength={120}
      />
      <Choice
        label="Feeding goal"
        value={form.feedingGoal}
        onChange={(value) => set('feedingGoal', value as PetFormValues['feedingGoal'])}
        options={[
          { label: 'Unsure', value: 'unsure' },
          { label: 'Maintain weight', value: 'maintain' },
          { label: 'Gain weight', value: 'gain' },
          { label: 'Lose weight', value: 'lose' },
        ]}
      />
      <Field
        label="Allergies or food reactions (optional)"
        value={form.allergies}
        onChangeText={(value) => set('allergies', value)}
        placeholder="Beef, chicken"
        multiline
        hint="Separate each item with a comma."
      />
    </View>
  );
}
